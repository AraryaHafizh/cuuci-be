import { Prisma } from "../../generated/prisma/client";
import { Station } from "../../generated/prisma/enums";
import { ApiError } from "../../utils/api-error";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { OutletService } from "../outlets/outlet.service";
import { PrismaService } from "../prisma/prisma.service";
import { GetJobsDTO } from "./dto/get-jobs.dto";
import { workers } from "./dto/workers.dto";

const nextStationMap = {
  WASHING: "IRONING",
  IRONING: "PACKING",
} as const;

function getNextStation(station: Station): Station | null {
  return nextStationMap[station as keyof typeof nextStationMap] ?? null;
}

export class WorkerService {
  private prisma: PrismaService;
  private cloudinaryService: CloudinaryService;
  private outletService: OutletService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinaryService = new CloudinaryService();
    this.outletService = new OutletService();
  }

  getWorkers = async (query: workers) => {
    const { id, outletId, name } = query;

    let where: any = { role: "WORKER" };

    if (id) where.id = id;
    if (outletId) where.outletId = outletId;
    if (name) where.name = { contains: name, mode: "insensitive" };

    const workers = await this.prisma.worker.findMany({ where });
    const filtered = await Promise.all(
      workers.map(async (worker) => {
        let outletName = "";
        const outlet = await this.outletService.getOutlet(worker.outletId!);
        outletName = outlet.data.name;

        return {
          ...worker,
          outletName,
        };
      })
    );

    return { message: "Workers fetched suceessfully", data: filtered };
  };

  getWorker = async (workerId: string) => {
    const worker = await this.prisma.worker.findFirst({
      where: { workerId },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profilePictureUrl: true,
            createdAt: true,
          },
        },
      },
    });

    if (!worker) throw new ApiError("worker not found", 404);

    return {
      message: "Worker fetched successfully",
      data: worker,
    };
  };

  getJobs = async (workerId: string, query: GetJobsDTO) => {
    const { page, limit } = query;
    const worker = await this.prisma.worker.findUnique({
      where: { workerId },
    });

    if (!worker) throw new Error("Worker not found");

    const skip = (page - 1) * limit;
    const jobs = await this.prisma.orderWorkProcess.findMany({
      skip,
      take: limit,
      where: {
        outletId: worker.outletId,
        status: "PENDING",
      },
      include: {
        order: {
          include: {
            customer: true,
            orderItems: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    const total = await this.prisma.orderWorkProcess.count({
      where: {
        outletId: worker.outletId,
        status: "PENDING",
      },
    });

    return {
      message: "Pending jobs fetched successfully",
      data: jobs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  getJobsHistory = async (workerId: string, query: GetJobsDTO) => {
    const { page, search, startDate, endDate, limit, isHistory } = query;
    const worker = await this.prisma.worker.findUnique({
      where: { workerId },
    });

    if (!worker) throw new ApiError("Worker not found", 404);

    const whereClause: Prisma.OrderWorkProcessWhereInput = {
      workerId,
      outletId: worker.outletId,
      status: "COMPLETED",
    };

    if (startDate || endDate) {
      whereClause.completedAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }

    if (search) {
      whereClause.OR = [
        { order: { orderNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    const skip = (page - 1) * limit;
    const history = await this.prisma.orderWorkProcess.findMany({
      skip,
      take: limit,
      where: whereClause,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
      orderBy: { completedAt: "desc" },
    });
    const total = await this.prisma.orderWorkProcess.count({
      where: whereClause,
    });

    return {
      message: "Jobs history fetched successfully",
      data: history,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  getTodayTasks = async (workerId: string) => {
    //ToDo
    const worker = await this.prisma.worker.findUnique({
      where: { workerId },
    });

    if (!worker) throw new Error("Worker not found");
  };

  takeJob = async (workerId: string, jobId: string) => {
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
    });

    if (!worker) throw new ApiError("Worker not found", 404);

    const job = await this.prisma.orderWorkProcess.findUnique({
      where: { id: jobId },
    });

    if (!job) throw new ApiError("Job not found", 404);
    if (job.outletId !== worker.outletId)
      throw new ApiError("Not authorized", 403);
    if (job.status !== "PENDING") throw new ApiError("Job already taken", 400);

    await this.prisma.orderWorkProcess.update({
      where: { id: jobId },
      data: {
        status: "IN_PROCESS",
        workerId,
      },
    });

    return { message: "Job taken successfully" };
  };

  validateItems = async (workerId: string, jobId: string, data: any) => {};
  requestBypass = async (workerId: string, jobId: string, data: any) => {};

  finishJob = async (workerId: string, jobId: string) => {
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
    });
    if (!worker) throw new ApiError("Worker not found", 404);

    const job = await this.prisma.orderWorkProcess.findUnique({
      where: { id: jobId },
      include: {
        order: { include: { payment: true } },
      },
    });
    if (!job) throw new ApiError("Job not found", 404);
    if (job.outletId !== worker.outletId)
      throw new ApiError("Not authorized", 403);

    if (job.status === "BYPASS_REQUESTED")
      throw new ApiError("Waiting for admin approval", 400);
    if (job.status !== "IN_PROCESS")
      throw new ApiError("Job is not in process", 400);

    const nextStation = getNextStation(job.station);

    await this.prisma.$transaction(async (tx) => {
      await tx.orderWorkProcess.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      if (nextStation) {
        await tx.order.update({
          where: { id: job.orderId },
          data: {
            status: nextStation,
          },
        });

        await tx.orderWorkProcess.create({
          data: {
            workerId,
            orderId: job.orderId,
            outletId: job.outletId,
            station: nextStation,
            status: "PENDING",
          },
        });
      } else {
        const isPaid = job.order.payment?.status === "SUCCESS";

        await tx.order.update({
          where: { id: job.orderId },
          data: {
            status: isPaid ? "READY_FOR_DELIVERY" : "WAITING_FOR_PAYMENT",
          },
        });
      }
    });

    return { message: "Job completed successfully" };
  };
}
