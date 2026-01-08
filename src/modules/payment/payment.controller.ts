import { NextFunction, Request, Response } from "express";
import { PaymentService } from "./payment.service";

export class PaymentController {
  private service: PaymentService;

  constructor() {
    this.service = new PaymentService();
  }

  // createPayment = async (req: Request, res: Response) => {
  //   const { orderId } = req.params;
  //   const result = await this.service.createPayment(data);
  //   res.status(200).json(result);
  // };

  handleWebhook = async (req: Request, res: Response) => {
    await this.service.handleWebhook(req);
    res.status(200).json({ message: "OK" });
  };

  getPaymentDetails = async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const customerId = res.locals.user.authUserId;
    const result = await this.service.getPaymentDetails(orderId, customerId);
    res.status(200).json(result);
  };
}
