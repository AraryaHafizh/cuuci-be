import { Router } from "express";
import { JWT_SECRET } from "../../config/env";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { UserUpdateController } from "./user.controller";
import { UserUpdateDTO } from "./dto/user-update.dto";
import { UserUpdatePasswordDTO } from "./dto/user-update-password.dto";

export class UserUpdateRouter {
  private router: Router;
  private userUpdateController: UserUpdateController;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.userUpdateController = new UserUpdateController();
    this.jwtMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN"]),
      this.userUpdateController.getUsers
    );
    this.router.patch(
      "/update/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      this.uploaderMiddleware
        .upload()
        .fields([{ name: "profilePictureUrl", maxCount: 1 }]),
      this.uploaderMiddleware.fileFilter([
        "image/jpeg",
        "image/png",
        "image/heic",
      ]),
      validateBody(UserUpdateDTO),
      this.userUpdateController.userUpdate
    );

    this.router.patch(
      "/update-password/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      validateBody(UserUpdatePasswordDTO),
      this.userUpdateController.userUpdatePassword
    );
    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN", "OUTLET_ADMIN"]),
      this.userUpdateController.getUser
    );
  };
  getRouter = () => {
    return this.router;
  };
}
