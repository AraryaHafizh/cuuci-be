import { Router } from "express";
import { JWT_SECRET } from "../../config/env";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { PaymentController } from "./payment.controller";

export class OrderRouter {
  private router: Router;
  private paymentController: PaymentController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.paymentController = new PaymentController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.post(
      "/orders/:orderId/payment",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.paymentController.createPayment
    );

    this.router.get(
      "/orders/:orderId/payment",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.paymentController.getPaymentDetails
    );

    this.router.post(
      "/webhooks/xendit",
      this.paymentController.handleWebhook
    );
  };

  getRouter = () => {
    return this.router;
  };
}
