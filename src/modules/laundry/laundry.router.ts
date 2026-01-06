import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { LaundryContorller } from "./laundry.controller";
import { JWT_SECRET } from "../../config/env";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateDTO } from "./dto/create.dto";

export class LaundryRouter {
  private router: Router;
  private laundryContorller: LaundryContorller;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.laundryContorller = new LaundryContorller();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN", "OUTLET_ADMIN"]),
      this.laundryContorller.getLaundryItems
    );
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN"]),
      validateBody(CreateDTO),
      this.laundryContorller.createLaundryItem
    );
    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN"]),
      this.laundryContorller.deleteLaundryItem
    );
  };
  getRouter = () => {
    return this.router;
  };
}
