import { Router } from "express";
import { JWT_SECRET } from "../../config/env";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { OutletController } from "./outlet.controller";

export class OutletRouter {
  private router: Router;
  private outletController: OutletController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.outletController = new OutletController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN", "CUSTOMER"]),
      this.outletController.getOutlets
    );
    this.router.post(
      "/create",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN"]),
      this.outletController.createOutlet
    );
    this.router.patch(
      "/edit",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN"]),
      this.outletController.editOutlet
    );
    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN"]),
      this.outletController.removeOutlet
    );
    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.outletController.getOutlet
    );
  };

  getRouter = () => {
    return this.router;
  };
}
