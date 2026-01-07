import { ApiError } from "../../utils/api-error";
import { hashPassword } from "../../utils/password";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { OutletService } from "../outlets/outlet.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserUpdatePasswordDTO } from "./dto/user-update-password.dto";
import { UserUpdateDTO } from "./dto/user-update.dto";
import { Users } from "./dto/users.dto";

export class UserUpdateService {
  private prisma: PrismaService;
  private cloudinaryService: CloudinaryService;
  private outletService: OutletService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinaryService = new CloudinaryService();
    this.outletService = new OutletService();
  }

  getUsers = async (query: Users) => {
    const { search, outletId, role, page, startDate, endDate, limit } = query;

    const where: any = {
      role: { not: "SUPER_ADMIN" },
      deletedAt: null,
    };

    if (outletId) {
      where.outletId = outletId;
      where.role = { not: "OUTLET_ADMIN" };
    }
    if (role) where.role = role;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new ApiError("Invalid date range", 400);
    }
    if (startDate || endDate) {
      where.createdAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { id: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;
    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });
    const filtered = await Promise.all(
      users.map(async (user) => {
        let outletName = "";
        if (user.role !== "CUSTOMER" && user.outletId) {
          const outlet = await this.outletService.getOutlet(user.outletId);
          outletName = outlet.data.name;
        }

        const { password, ...rest } = user;
        return { ...rest, outletName };
      })
    );
    
    const total = await this.prisma.order.count({
      where,
    });

    return {
      message: "Users fetched successfully",
      data: filtered,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  getUser = async (id: string) => {
    const user = await this.prisma.user.findFirst({ where: { id } });

    if (!user) throw new ApiError("User not found", 404);

    return {
      message: "User fetched successfully",
      data: user,
    };
  };

  userUpdate = async (
    id: string,
    body: UserUpdateDTO,
    profilePictureUrl?: Express.Multer.File
  ) => {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) throw new ApiError("user not found", 404);

    const updateData: any = {};

    if (body.name) {
      updateData.name = body.name;
    }

    if (body.phoneNumber) {
      updateData.phoneNumber = body.phoneNumber;
    }

    if (profilePictureUrl) {
      if (user.profilePictureUrl) {
        await this.cloudinaryService.remove(user.profilePictureUrl);
      }

      const { secure_url } = await this.cloudinaryService.upload(
        profilePictureUrl
      );

      updateData.profilePictureUrl = secure_url;
    }

    if (Object.keys(updateData).length === 0) {
      return { message: "nothing to update" };
    }

    await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return { message: "update user success" };
  };

  userUpdatePassword = async (userId: string, body: UserUpdatePasswordDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) throw new ApiError("user not found", 404);

    const updateData: any = {};
    if (body.password) {
      const hashedPassword = await hashPassword(body.password);
      updateData.password = hashedPassword;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return { message: "update user success" };
  };

  deleteUser = async (userId: string) => {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    return { message: "user deleted successfully" };
  };
}
