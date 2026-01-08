import { NextFunction, Request, Response } from "express";
import { PaymentService } from "./payment.service";


export class PaymentController {
  private service: PaymentService;

  constructor() {
    this.service = new PaymentService();
  }

  createPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const result = await this.service.createPayment(orderId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.handleWebhook(req.body);
      res.status(200).json({ message: 'OK' });
    } catch (error) {
      next(error);
    }
  };

  getPaymentDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const customerId = res.locals.user.authUserId;
      const result = await this.service.getPaymentDetails(orderId, customerId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}