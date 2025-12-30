import { Role } from "../../generated/prisma/enums";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { PushBulkDTO } from "./dto/push-bulk.dto";
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
    const notif = await this.prisma.notification.create({
      data: { title, description },
    });

    switch (role) {
      case "CUSTOMER": {
        await this.prisma.customerNotification.create({
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
            outletId: receiverId,
            notificationId: notif.id,
          },
        });
        return { message: "Notification sent" };
      }

      default:
        throw new ApiError("Invalid role", 400);
    }
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

    const notif = await this.prisma.notification.create({
      data: { title, description },
    });

    const receiver = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      include,
    });

    if (!receiver) throw new ApiError("Outlet not found", 404);

    if (role === "WORKER") {
      await Promise.all(
        receiver.workers.map((worker) =>
          this.prisma.workerNotification.create({
            data: {
              workerId: worker.id,
              notificationId: notif.id,
            },
          })
        )
      );
      return;
    }

    if (role === "DRIVER") {
      await Promise.all(
        receiver.drivers.map((driver) =>
          this.prisma.driverNotification.create({
            data: {
              driverId: driver.id,
              notificationId: notif.id,
            },
          })
        )
      );
      return;
    }

    throw new ApiError("Invalid role", 400);
  };
}
