import { Role } from "../../generated/prisma/enums";
import { ApiError } from "../../utils/api-error";
import { comparePassword, hashPassword } from "../../utils/password";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { DriverService } from "../drivers/driver.service";
import { OutletService } from "../outlets/outlet.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserUpdatePasswordDTO } from "./dto/user-update-password.dto";
import { UserUpdateDTO } from "./dto/user-update.dto";
import { Users } from "./dto/users.dto";

export class UserUpdateService {
  private prisma: PrismaService;
  private cloudinaryService: CloudinaryService;
  private outletService: OutletService;
  private driverService: DriverService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinaryService = new CloudinaryService();
    this.outletService = new OutletService();
    this.driverService = new DriverService();
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

    const total = await this.prisma.user.count({
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

  getUser = async (id: string, query: Users) => {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findFirst({ where: { id } });
    if (!user) throw new ApiError("User not found", 404);

    let task: any[] = [];
    let total = 0;

    switch (user.role) {
      case "DRIVER": {
        const history = await this.driverService.getRequestsHistory(id, {
          page,
          limit,
          take: limit,
          search: "",
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        task = history.data;
        total = history.meta.total;
        break;
      }

      case "WORKER": {
        const worker = await this.prisma.worker.findFirst({
          where: { workerId: id },
        });

        if (worker) {
          task = await this.prisma.orderWorkProcess.findMany({
            where: { workerId: worker.id },
            skip,
            take: limit,
            include: { order: true },
          });

          total = await this.prisma.orderWorkProcess.count({
            where: { workerId: worker.id },
          });
        }
        break;
      }

      case "CUSTOMER": {
        task = await this.prisma.order.findMany({
          where: { customerId: id },
          skip,
          take: limit,
          include: { payment: true },
          orderBy: { createdAt: "desc" },
        });

        total = await this.prisma.order.count({
          where: { customerId: id },
        });
        break;
      }
    }

    return {
      message: "User fetched successfully",
      data: {
        user,
        task,
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

    if (body.password) {
      hashPassword(body.password);
      updateData.password = body.password;
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
  console.log('Received body:', body);
  console.log('Body type:', typeof body);
  console.log('oldPassword type:', typeof body.oldPassword);
  console.log('newPassword type:', typeof body.newPassword);
  const user = await this.prisma.user.findFirst({
    where: { id: userId },
  });

  if (!user) throw new ApiError("User not found", 404);
  
  // Verify old password
  if (body.oldPassword) {
    const isValid = await comparePassword(body.oldPassword, user.password);
    if (!isValid) {
      throw new ApiError("Current password is incorrect", 400);
    }
  }

  const hashedPassword = await hashPassword(body.newPassword);

  await this.prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { message: "Password updated successfully" };
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
