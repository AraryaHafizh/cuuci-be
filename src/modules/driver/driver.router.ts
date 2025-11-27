// src/modules/driver/driver.router.ts
import { Router } from "express";
import { DriverController } from "./driver.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { Role } from "../../generated/prisma/enums";

export class DriverRouter {
  private router: Router;
  private driverController: DriverController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.driverController = new DriverController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    const jwtSecret = process.env.JWT_SECRET!;

    // List pickup/delivery requests for the driver
    this.router.get(
      "/requests",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.jwtMiddleware.verifyRole([Role.DRIVER]),
      this.driverController.getRequests
    );

    // ===== DETAILS =====
    this.router.get(
      "/pickup/:pickupOrderId",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.jwtMiddleware.verifyRole([Role.DRIVER]),
      this.driverController.getPickupDetail
    );

    this.router.get(
      "/delivery/:deliveryOrderId",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.jwtMiddleware.verifyRole([Role.DRIVER]),
      this.driverController.getDeliveryDetail
    );

    // ===== Process pickup =====
    this.router.post(
      "/pickup/:pickupOrderId/accept",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.jwtMiddleware.verifyRole([Role.DRIVER]),
      this.driverController.acceptPickup
    );

    this.router.post(
      "/pickup/:pickupOrderId/complete",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.jwtMiddleware.verifyRole([Role.DRIVER]),
      this.driverController.completePickup
    );

    // ===== Process delivery =====
    this.router.post(
      "/delivery/:deliveryOrderId/accept",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.jwtMiddleware.verifyRole([Role.DRIVER]),
      this.driverController.acceptDelivery
    );

    this.router.post(
      "/delivery/:deliveryOrderId/complete",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.jwtMiddleware.verifyRole([Role.DRIVER]),
      this.driverController.completeDelivery
    );
  };

  getRouter = () => {
    return this.router;
  };
}
