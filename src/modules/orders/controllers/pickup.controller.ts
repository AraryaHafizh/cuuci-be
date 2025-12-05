import { Request, Response } from "express";
import { PickupService } from "../services/pickup.service";

export class PickupController {
  private pickupService: PickupService;

  constructor() {
    this.pickupService = new PickupService();
  }

  createPickupOrder = async (req: Request, res: Response) => {
    const body = req.body;
    const authUserId = String(res.locals.user.id);
    const result = await this.pickupService.createPickupOrder(authUserId, body)
  }
}
