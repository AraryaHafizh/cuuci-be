import { Role } from "../../generated/prisma/enums";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { PushDTO } from "./dto/push.dto";

export class NotificationService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getNotifications = async (userId: string, role: Role) => {
    const include: any = {};
    const where: any = {};

    let relationKey = "";

    switch (role) {
      case "CUSTOMER":
        relationKey = "userNotifications";
        include.userNotifications = true;
        where.userNotifications = {
          some: { userId },
        };
        break;

      case "WORKER":
        relationKey = "workerNotifications";
        include.workerNotifications = true;
        where.workerNotifications = {
          some: { workerid: userId },
        };
        break;

      case "DRIVER":
        relationKey = "driverNotifications";
        include.driverNotifications = true;
        where.driverNotifications = {
          some: { driverId: userId },
        };
        break;

      case "OUTLET_ADMIN":
        relationKey = "adminNotifications";
        include.adminNotifications = true;
        where.adminNotifications = {
          some: { adminId: userId },
        };
        break;
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
    });

    const filteredNotifications = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description,
    }));

    const isRead = notifications.every((n) =>
      n[relationKey].every((rel: any) => rel.isRead === true)
    );

    return {
      message: "notifications fetched successfully",
      data: filteredNotifications,
      isRead,
    };
  };

  readAll = async (userId: string, role: Role) => {
    switch (role) {
      case "CUSTOMER": {
        const updated = await this.prisma.userNotification.updateMany({
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
          where: { workerId: userId },
          data: { isRead: true },
        });
        return {
          message: "All notifications marked as read",
          updatedCount: updated.count,
        };
      }

      case "DRIVER": {
        const updated = await this.prisma.driverNotification.updateMany({
          where: { driverId: userId },
          data: { isRead: true },
        });
        return {
          message: "All notifications marked as read",
          updatedCount: updated.count,
        };
      }

      case "OUTLET_ADMIN": {
        const updated = await this.prisma.adminNotification.updateMany({
          where: { adminId: userId },
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
    const notif = await this.prisma.notification.create({
      data: { title, description },
    });

    switch (role) {
      case "CUSTOMER": {
        await this.prisma.userNotification.create({
          data: {
            userId: receiverId,
            notificationId: notif.id,
          },
        });
        return { message: "Notification sent" };
      }

      case "WORKER": {
        await this.prisma.workerNotification.create({
          data: {
            workerId: receiverId,
            notificationId: notif.id,
          },
        });
        return { message: "Notification sent" };
      }

      case "DRIVER": {
        await this.prisma.driverNotification.create({
          data: {
            driverId: receiverId,
            notificationId: notif.id,
          },
        });
        return { message: "Notification sent" };
      }

      case "OUTLET_ADMIN": {
        await this.prisma.adminNotification.create({
          data: {
            adminId: receiverId,
            notificationId: notif.id,
          },
        });
        return { message: "Notification sent" };
      }

      default:
        throw new ApiError("Invalid role", 400);
    }
  };
}
