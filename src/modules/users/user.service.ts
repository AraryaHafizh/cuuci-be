import { sign } from "jsonwebtoken";
import { BASE_URL_FE, JWT_SECRET_VERIFY } from "../../config/env";
import { ApiError } from "../../utils/api-error";
import { comparePassword, hashPassword } from "../../utils/password";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { DriverService } from "../drivers/driver.service";
import { MailService } from "../mail/mail.service";
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
  private mailservice: MailService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinaryService = new CloudinaryService();
    this.outletService = new OutletService();
    this.driverService = new DriverService();
    this.mailservice = new MailService();
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
    let summary: any = {};

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

        const finishedStatuses = ["COMPLETED", "ARRIVED_AT_OUTLET"];

        summary = {
          totalDeliveries: task.length,
          finishedDeliveries: task.filter((t) =>
            finishedStatuses.includes(t.status)
          ).length,
        };

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

          summary = {
            totalTasks: total,
            finishedTasks: task.filter((t) => t.status === "COMPLETED").length,
          };
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

        summary = {
          totalOrders: total,
        };
        break;
      }
    }

    return {
      message: "User fetched successfully",
      data: {
        user,
        task,
        summary,
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
    let emailUpdateMessage = false; 
    if (body.name) {
      updateData.name = body.name;
    }
    if (body.phoneNumber) {
      updateData.phoneNumber = body.phoneNumber;
    }
    if (body.email && body.email !== user.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email: body.email },
      });
      if (emailExists) {
        throw new ApiError("Email already in use", 400);
      }
      updateData.pendingEmail = body.email;
      updateData.emailVerified = false;
      emailUpdateMessage = true;

      const token = sign(
        {
          id: user.id,
          type: "emailUpdate",
          newEmail: body.email,
        },
        JWT_SECRET_VERIFY!,
        { expiresIn: "5h" }
      );
      await this.mailservice.sendEmail(
        body.email,
        "Verify your new email address",
        "verify-email-update",
        {
          verificationUrl: `${BASE_URL_FE}/dashboard/account/verify-email-update/${token}`,
          name: user.name,
        }
      );
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
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        pendingEmail: true,
        emailVerified: true,
        profilePictureUrl: true,
      },
    });

    return {
      message: emailUpdateMessage 
      ? "Verification email sent to your new email address" 
      : "Profile updated successfully",
      data: updatedUser,
    };
  };

  userUpdatePassword = async (userId: string, body: UserUpdatePasswordDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) throw new ApiError("User not found", 404);

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
