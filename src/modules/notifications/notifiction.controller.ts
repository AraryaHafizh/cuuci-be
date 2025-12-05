import { Request, Response } from "express";
import { NotificationService } from "./notification.service";

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  getNotifications = async (req: Request, res: Response) => {
    const { id: authUserId, role: authUserRole } = res.locals.user;
    const result = await this.notificationService.getNotifications(
      authUserId,
      authUserRole
    );
    res.status(200).send(result);
  };

  readAll = async (req: Request, res: Response) => {
    const { id: authUserId, role: authUserRole } = res.locals.user;
    const result = await this.notificationService.readAll(
      authUserId,
      authUserRole
    );
    res.status(200).send(result);
  };
}
