import { Router } from "express";
import { JWT_SECRET } from "../../config/env";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { AddressController } from "./address.controller";
import { validateBody } from "../../middlewares/validation.middleware";
import { createDTO } from "./dto/create.dto";
import { updateDTO } from "./dto/edit.dto";

export class Addressrouter {
  private router: Router;
  private jwtMiddleware: JwtMiddleware;
  private addressController: AddressController;

  constructor() {
    this.router = Router();
    this.jwtMiddleware = new JwtMiddleware();
    this.addressController = new AddressController();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      this.addressController.getAddresses
    );
    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      this.addressController.getAddress
    );
    this.router.post(
      "/create",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      validateBody(createDTO),
      this.addressController.createAddress
    );
    this.router.post(
      "/primary/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      this.addressController.setPrimaryAddress
    );
    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      validateBody(updateDTO),
      this.addressController.updateAddress
    );
    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      this.addressController.deleteAddress
    );
  };
  getRouter = () => {
    return this.router;
  };
}
