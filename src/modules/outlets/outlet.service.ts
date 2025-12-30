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

  getNearestOutlet = async (latitude: number, longitude: number) => {};

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
