import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { DriverContorller } from "./driver.controller";
import { JWT_SECRET } from "../../config/env";

export class DriverRouter {
  private router: Router;
  private driverController: DriverContorller;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.driverController = new DriverContorller();
    this.jwtMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN", "OUTLET_ADMIN"]),
      this.driverController.getDrivers
    );
    this.router.get(
      "/requests",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.getRequests
    );
    this.router.get(
      "/requests/ongoing",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.getOngoingRequest
    );
    this.router.get(
      "/requests/history",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.getRequestsHistory
    );
    this.router.post(
      "/requests/take/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.takeOrder
    );
    this.router.post(
      "/requests/confirm/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.uploaderMiddleware
        .upload()
        .fields([{ name: "confirmationProof", maxCount: 1 }]),
      this.uploaderMiddleware.fileFilter([
        "image/jpeg",
        "image/png",
        "image/heic",
      ]),
      this.driverController.confirmOrder
    );
    this.router.post(
      "/requests/finish/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.finishOrder
    );
    this.router.get(
      "/requests/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.getRequest
    );
    this.router.post(
      "/delivery/pickup/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.takeDelivery
    );
    this.router.post(
      "/delivery/finish/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["DRIVER"]),
      this.driverController.finishDelivery
    );
    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN", "OUTLET_ADMIN"]),
      this.driverController.getDriver
    );
  };
  getRouter = () => {
    return this.router;
  };
}
