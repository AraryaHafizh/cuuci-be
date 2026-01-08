import { Prisma } from "../../generated/prisma/client";
import { Station } from "../../generated/prisma/enums";
import { ApiError } from "../../utils/api-error";
import { AttendanceService } from "../attendances/attendance.service";
import { NotificationService } from "../notifications/notification.service";
import { OutletService } from "../outlets/outlet.service";
import { PrismaService } from "../prisma/prisma.service";
import { GetJobsDTO } from "./dto/get-jobs.dto";
import { ValidateDTO } from "./dto/validate.dto";
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
  private notificationService: NotificationService;
  private outletService: OutletService;
  private attendanceService: AttendanceService;

  constructor() {
    this.prisma = new PrismaService();
    this.notificationService = new NotificationService();
    this.outletService = new OutletService();
    this.attendanceService = new AttendanceService();
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

    return { messae: "Workers fetched suceessfully", data: filtered };
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
    const skip = (page - 1) * limit;

    const worker = await this.prisma.worker.findUnique({
      where: { workerId },
    });

    if (!worker) throw new Error("Worker not found");

    const jobs = await this.prisma.orderWorkProcess.findMany({
      skip,
      where: {
        outletId: worker.outletId,
        OR: [
          { status: "PENDING" },
          { status: "IN_PROCESS", workerId: worker.id },
        ],
      },
      include: {
        order: {
          include: {
            customer: true,
            orderItems: {
              include: { laundryItem: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
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

  getJobDetail = async (workerId: string, jobId: string) => {
    const worker = await this.prisma.worker.findUnique({
      where: { workerId },
    });
    if (!worker) throw new ApiError("Worker not found", 404);

    const job = await this.prisma.orderWorkProcess.findUnique({
      where: { id: jobId },
      include: {
        order: {
          include: {
            customer: true,
            orderItems: {
              select: {
                laundryItemId: true,
                quantity: true,
                laundryItem: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!job) throw new ApiError("Job not found", 404);
    if (job.workerId !== worker.id) throw new ApiError("Not authorized", 403);

    return {
      message: "Job detail fetched successfully",
      data: job,
    };
  };

  getJobsHistory = async (workerId: string, query: GetJobsDTO) => {
    const { search, startDate, endDate, page, limit, status, station } = query;

    const worker = await this.prisma.worker.findUnique({
      where: { workerId },
    });

    if (!worker) throw new ApiError("Worker not found", 404);

    const whereClause: Prisma.OrderWorkProcessWhereInput = {
      workerId: worker.id,
      outletId: worker.outletId,
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
    if (status) whereClause.status = status;

    if (station) whereClause.station = station;

    const skip = (page - 1) * limit;

    const history = await this.prisma.orderWorkProcess.findMany({
      skip,
      take: limit,
      where: { workerId, outletId: worker.outletId, status: "COMPLETED" },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            orderNumber: true,
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
      where: { workerId },
    });
    if (!worker) throw new ApiError("Worker not found", 404);

    const isWorking = await this.attendanceService.getStatus(
      worker.workerId,
      "DRIVER"
    );

    if (!isWorking.isWorking) {
      throw new ApiError(
        "You are not checked in yet. Please check in to start working.",
        400
      );
    }

    if (worker.isBypass)
      throw new ApiError(
        "You must resolve the bypass request before taking another job",
        404
      );

    let customerId: string | null = null;
    let station: Station | null = null;

    await this.prisma.$transaction(async (tx) => {
      const hasBypass = await tx.orderWorkProcess.findFirst({
        where: {
          workerId: worker.id,
          status: "BYPASS_REQUESTED",
        },
      });

      if (hasBypass) {
        throw new ApiError(
          "You must resolve the bypass request before taking another job",
          400
        );
      }

      const job = await tx.orderWorkProcess.findUnique({
        where: { id: jobId },
        include: { order: true },
      });

      if (!job) throw new ApiError("Job not found", 404);
      if (job.outletId !== worker.outletId)
        throw new ApiError("Not authorized", 403);

      const workerResult = await tx.worker.updateMany({
        where: {
          id: worker.id,
          station: null,
        },
        data: {
          station: job.station,
        },
      });

      if (workerResult.count === 0) {
        throw new ApiError("You have an ongoing task", 400);
      }

      const jobResult = await tx.orderWorkProcess.updateMany({
        where: {
          id: jobId,
          status: "PENDING",
        },
        data: {
          status: "IN_PROCESS",
          workerId: worker.id,
        },
      });

      if (jobResult.count === 0) {
        throw new ApiError("Job already taken", 400);
      }

      await tx.order.update({
        where: { id: job.orderId },
        data: {
          status: job.station,
        },
      });

      customerId = job.order.customerId;
      station = job.station;
    });

    if (station === "WASHING" && customerId) {
      await this.notificationService.pushNotification({
        title: "Order Update",
        description: "Your laundry is being washed",
        receiverId: customerId,
        role: "CUSTOMER",
      });
    }

    return { message: "Job taken successfully" };
  };

  requestBypass = async (workerId: string, jobId: string, note: string) => {
    const worker = await this.prisma.worker.findUnique({
      where: { workerId },
      include: { worker: { select: { name: true } } },
    });

    if (!worker) throw new ApiError("Worker not found", 404);

    let orderNumber = "";
    let outletId = "";

    await this.prisma.$transaction(async (tx) => {
      const job = await tx.orderWorkProcess.findUnique({
        where: { id: jobId },
        include: {
          order: {
            include: {
              outlet: {
                select: { id: true, adminId: true },
              },
            },
          },
        },
      });

      if (!job) throw new ApiError("Job not found", 404);
      if (job.workerId !== worker.id) throw new ApiError("Not authorized", 403);

      if (job.status === "BYPASS_REQUESTED")
        throw new ApiError("Bypass already requested", 400);

      if (job.status === "COMPLETED")
        throw new ApiError("Job already completed", 400);

      await tx.notes.create({
        data: {
          orderId: job.order.id,
          type: "BYPASS",
          body: note,
        },
      });

      await tx.orderWorkProcess.update({
        where: { id: jobId },
        data: { status: "BYPASS_REQUESTED" },
      });

      await tx.worker.update({
        where: { id: worker.id },
        data: { isBypass: true },
      });

      orderNumber = job.order.orderNumber;
      outletId = job.order.outlet.id!;
    });

    await this.notificationService.pushNotification({
      title: "Bypass Request",
      description: `Order ${orderNumber} has a bypass request from ${worker.worker.name}`,
      receiverId: outletId,
      role: "OUTLET_ADMIN",
    });

    return { message: "Bypass request sent successfully" };
  };

  validateItems = async (
    jobId: string,
    data: ValidateDTO
  ): Promise<boolean> => {
    if (!data?.orderItems || data.orderItems.length === 0) {
      throw new ApiError("Order items is required", 400);
    }

    const job = await this.prisma.orderWorkProcess.findUnique({
      where: { id: jobId },
      include: {
        order: {
          include: {
            orderItems: true,
          },
        },
      },
    });

    if (!job) throw new ApiError("Job not found", 404);

    const referenceItems = job.order.orderItems;

    const referenceMap = new Map<string, number>(
      referenceItems.map((item) => [item.laundryItemId, item.quantity])
    );

    if (referenceMap.size !== data.orderItems.length) {
      return false;
    }

    for (const item of data.orderItems) {
      const refQty = referenceMap.get(item.id);

      if (refQty === undefined) return false;
      if (refQty !== item.qty) return false;
    }

    return true;
  };

  finishJob = async (workerId: string, jobId: string, data: ValidateDTO) => {
    const worker = await this.prisma.worker.findUnique({
      where: { workerId },
    });

    if (!worker) throw new ApiError("Worker not found", 404);

    const job = await this.prisma.orderWorkProcess.findUnique({
      where: { id: jobId },
      include: {
        order: { select: { orderNumber: true, outletId: true, payment: true } },
      },
    });

    if (!job) throw new ApiError("Job not found finish", 404);

    if (job.status !== "IN_PROCESS") {
      throw new ApiError("Job is not in process", 400);
    }

    if (job.workerId !== worker.id) {
      throw new ApiError("You are not assigned to this job", 403);
    }

    const isValid = await this.validateItems(jobId, data);
    if (!isValid) {
      throw new ApiError("Item quantity mismatch. Please check again.", 400);
    }

    const nextStation = getNextStation(job.station);

    await this.prisma.$transaction(async (tx) => {
      await tx.orderWorkProcess.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      await tx.worker.update({
        where: { id: worker.id },
        data: {
          station: null,
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
            orderId: job.orderId,
            outletId: job.outletId,
            station: nextStation,
            status: "PENDING",
            notes: job.notes,
          },
        });
      } else {
        const finalStatus = job.order.payment
          ? "READY_FOR_DELIVERY"
          : "WAITING_FOR_PAYMENT";

        await tx.order.update({
          where: { id: job.orderId },
          data: { status: finalStatus },
        });
      }
    });

    if (nextStation) {
      await this.notificationService.pushNotificationBulk({
        title: "New Task Available",
        description: `${nextStation} task for Order #${job.order.orderNumber}.`,
        outletId: job.order.outletId,
        role: "WORKER",
      });
    }

    return { message: "Job completed successfully" };
  };
}
