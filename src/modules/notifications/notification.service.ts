import { Prisma } from "../../generated/prisma/client";
import { Role } from "../../generated/prisma/enums";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { GetNotificationsDTO } from "./dto/get-notification.dto";
import { PushBulkDTO } from "./dto/push-bulk.dto";
import { PushDTO } from "./dto/push.dto";

export class NotificationService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getNotifications = async (userId: string, role: Role, query: GetNotificationsDTO) => {
    const { page, startDate, endDate, limit } = query;
    const whereClause: Prisma.NotificationWhereInput = {};
    const includeClause: Prisma.NotificationInclude = {};

    let relationKey = "";

    switch (role) {
      case "CUSTOMER":
        relationKey = "userNotifications";
        includeClause.customerNotifications = true;
        whereClause.customerNotifications = {
          some: { userId },
        };
        break;

      case "WORKER":
        relationKey = "workerNotifications";
        includeClause.workerNotifications = true;
        whereClause.workerNotifications = {
          some: { userId },
        };
        break;

      case "DRIVER":
        relationKey = "driverNotifications";
        includeClause.driverNotifications = true;
        whereClause.driverNotifications = {
          some: { userId },
        };
        break;

      case "OUTLET_ADMIN":
        const outlet = await this.prisma.outlet.findUnique({
          where: { adminId: userId },
        });
        relationKey = "adminNotifications";
        includeClause.adminNotifications = true;
        whereClause.adminNotifications = {
          some: { outletId: outlet!.id },
        };
        break;
    }

    const notifications = await this.prisma.notification.findMany({
      where: whereClause,
      include: includeClause,
      orderBy: { createdAt: "desc" },
    });

    const filteredNotifications = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description,
    }));

    const isRead = notifications.every((n) =>
      (n as any)[relationKey].every((rel: any) => rel.isRead === true)
    );
    const total = await this.prisma.notification.count({
      where: whereClause,
    });

    return {
      message: "notifications fetched successfully",
      isRead,
      data: filteredNotifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  readAll = async (userId: string, role: Role) => {
    switch (role) {
      case "CUSTOMER": {
        const updated = await this.prisma.customerNotification.updateMany({
          where: { userId },
          data: { isRead: true },
        });
        return {
          message: "All notifications marked as read",
          updatedCount: updated.count,
        };
      }

      case "WORKER": {
        const updated = await this.prisma.workerNotification.updateMany({
          where: { userId },
          data: { isRead: true },
        });
        return {
          message: "All notifications marked as read",
          updatedCount: updated.count,
        };
      }

      case "DRIVER": {
        const updated = await this.prisma.driverNotification.updateMany({
          where: { userId },
          data: { isRead: true },
        });
        return {
          message: "All notifications marked as read",
          updatedCount: updated.count,
        };
      }

      case "OUTLET_ADMIN": {
        const updated = await this.prisma.adminNotification.updateMany({
          where: { outletId: userId },
          data: { isRead: true },
        });
        return {
          message: "All notifications marked as read",
          updatedCount: updated.count,
        };
      }

      default:
        throw new ApiError("Invalid role", 400);
    }
  };

  pushNotification = async ({
    title,
    description,
    receiverId,
    role,
  }: PushDTO) => {
    await this.prisma.$transaction(async (tx) => {
      const notif = await tx.notification.create({
        data: { title, description },
      });

      switch (role) {
        case "CUSTOMER": {
          await tx.customerNotification.create({
            data: {
              userId: receiverId,
              notificationId: notif.id,
            },
          });
          return { message: "Notification sent" };
        }

        case "WORKER": {
          await tx.workerNotification.create({
            data: {
              userId: receiverId,
              notificationId: notif.id,
            },
          });
          return { message: "Notification sent" };
        }

        case "DRIVER": {
          await tx.driverNotification.create({
            data: {
              userId: receiverId,
              notificationId: notif.id,
            },
          });
          return { message: "Notification sent" };
        }

        case "OUTLET_ADMIN": {
          await tx.adminNotification.create({
            data: {
              outletId: receiverId,
              notificationId: notif.id,
            },
          });
          return { message: "Notification sent" };
        }

        default:
          throw new ApiError("Invalid role", 400);
      }
    });
  };

  pushNotificationBulk = async ({
    title,
    description,
    outletId,
    role,
  }: PushBulkDTO) => {
    const include =
      role === "WORKER"
        ? { workers: true }
        : role === "DRIVER"
        ? { drivers: true }
        : {};

    await this.prisma.$transaction(async (tx) => {
      const notif = await tx.notification.create({
        data: { title, description },
      });

      const receiver = await tx.outlet.findUnique({
        where: { id: outletId },
        include,
      });

      if (!receiver) throw new ApiError("Outlet not found", 404);

      if (role === "WORKER") {
        await tx.workerNotification.createMany({
          data: receiver.workers.map((worker) => ({
            userId: worker.workerId,
            notificationId: notif.id,
            isRead: false,
          })),
        });
        return;
      }

      if (role === "DRIVER") {
        await tx.driverNotification.createMany({
          data: receiver.drivers.map((driver) => ({
            userId: driver.driverId,
            notificationId: notif.id,
            isRead: false,
          })),
        });
        return;
      }

      throw new ApiError("Invalid role", 400);
    });
  };
}
