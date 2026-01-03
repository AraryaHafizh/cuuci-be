import { getDistance } from "../../script/getHaversineDistance";
import { ApiError } from "../../utils/api-error";
import { generateOutletId } from "../../utils/generate-id";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDTO } from "./dto/create.dto";

export class OutletService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getOutlets = async () => {
    const outlets = await this.prisma.outlet.findMany({
      include: {
        admin: { select: { name: true } },
        orders: true,
        workers: true,
        drivers: true,
      },
      where: {
        deletedAt: null,
      },
    });
    return { message: "Outets fetched successfully", data: outlets };
  };

  getOutlet = async (id: string) => {
    const outlet = await this.prisma.outlet.findFirst({ where: { id } });

    if (!outlet) throw new ApiError("Outlet not found", 404);

    return { message: "Outets fetched successfully", data: outlet };
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

    const outlets = await this.prisma.outlet.findMany();

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
