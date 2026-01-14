import { Prisma } from "../../generated/prisma/client";
import { getDistance } from "../../script/getHaversineDistance";
import { ApiError } from "../../utils/api-error";
import { generateOutletId } from "../../utils/generate-id";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDTO } from "./dto/create.dto";
import { OutletsDTO } from "./dto/outlet.dto";

export class OutletService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getOutlets = async (query: OutletsDTO) => {
    const { outletId, page, search, startDate, endDate, limit } = query;

    const whereClause: Prisma.OutletWhereInput = {
      deletedAt: null,
    };

    if (outletId) {
      whereClause.id = outletId;
    }

    if (search) {
      whereClause.name = { contains: search, mode: "insensitive" };
    }

    if (startDate || endDate) {
      whereClause.createdAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }

    const skip = (page - 1) * limit;

    const outlets = await this.prisma.outlet.findMany({
      skip,
      take: limit,
      where: whereClause,
      include: {
        admin: {
          where: { deletedAt: null },
          select: { name: true },
        },
        workers: { where: { worker: { deletedAt: null } } },
        drivers: { where: { driver: { deletedAt: null } } },
        orders: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const total = await this.prisma.outlet.count({
      where: whereClause,
    });

    return {
      message: "Outlets fetched successfully",
      data: outlets,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  getOutlet = async (id: string) => {
    const outlet = await this.prisma.outlet.findFirst({ where: { id } });

    if (!outlet) throw new ApiError("Outlet not found", 404);

    return { message: "Outlets fetched successfully", data: outlet };
  };

  getNearestOutlet = async (
    userId: string,
    latitude?: number,
    longitude?: number
  ) => {
    let finalLatitude: number;
    let finalLongitude: number;

    const isEmptyCoord =
      latitude == null ||
      longitude == null ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude);

    if (isEmptyCoord) {
      const defaultAddress = await this.prisma.address.findFirst({
        where: {
          userId,
          isPrimary: true,
        },
      });

      if (!defaultAddress) {
        throw new ApiError(
          "Default address not found and coordinates not provided",
          400
        );
      }

      finalLatitude = Number(defaultAddress.latitude);
      finalLongitude = Number(defaultAddress.longitude);
    } else {
      finalLatitude = latitude!;
      finalLongitude = longitude!;
    }

    const outlets = await this.prisma.outlet.findMany({
      where: { deletedAt: null },
    });

    if (!outlets.length) {
      throw new ApiError("No outlets available", 400);
    }

    const nearestOutlets = outlets
      .map((outlet) => ({
        ...outlet,
        distance: getDistance(
          finalLatitude,
          finalLongitude,
          Number(outlet.latitude),
          Number(outlet.longitude)
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    return {
      message: "Nearest outlets fetched successfully",
      data: nearestOutlets,
    };
  };

  createOutlet = async (body: CreateDTO) => {
    const admin = await this.prisma.user.findFirst({
      where: { id: body.adminId },
    });

    if (!admin) throw new ApiError("Admin not found", 404);
    const outletId = generateOutletId();

    const outlet = await this.prisma.outlet.create({
      data: { ...body, outletId },
    });

    return { message: "Outlet created successfully", data: outlet };
  };

  editOutlet = async (id: string, body: Partial<CreateDTO>) => {
    const outlet = await this.prisma.outlet.findFirst({ where: { id } });

    if (!outlet) throw new ApiError("Outlet not found", 404);

    const updatedOutlet = await this.prisma.outlet.update({
      where: { id },
      data: body,
    });

    return { message: "Outlet updated successfully", data: updatedOutlet };
  };

  removeOutlet = async (id: string) => {
    const outlet = await this.prisma.outlet.findFirst({ where: { id } });

    if (!outlet) throw new ApiError("Outlet not found", 404);

    await this.prisma.outlet.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: "Outlet deleted successfully" };
  };
}
