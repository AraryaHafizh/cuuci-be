import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDTO } from "./dto/create.dto";

export class LaundryService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getLaundryItems = async () => {
    const laundryItems = await this.prisma.laundryItem.findMany({
      where: { deletedAt: null },
    });
    if (!laundryItems) throw new ApiError("No laundry items found", 404);

    return {
      message: "Laundry items fetched successfully",
      data: laundryItems,
    };
  };

  createLaundryItem = async (body: CreateDTO) => {
    const { name } = body;

    const laundryItem = await this.prisma.laundryItem.create({
      data: { name },
    });

    return {
      message: "Laundry item created successfully",
      data: laundryItem,
    };
  };

  deleteLaundryItem = async (id: string) => {
    await this.prisma.laundryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: "Laundry item deleted successfully" };
  };
}
