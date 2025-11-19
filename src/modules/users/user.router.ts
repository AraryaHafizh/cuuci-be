import { Router } from "express";
import { JWT_SECRET } from "../../config/env";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { UserUpdateController } from "./user.controller";
import { UserUpdateDTO } from "./dto/user-update.dto";

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
    this.router.patch(
      "/update/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["CUSTOMER"]),
      this.uploaderMiddleware
        .upload()
        .fields([{ name: "profilePicture", maxCount: 1 }]),
      this.uploaderMiddleware.fileFilter([
        "image/jpeg",
        "image/png",
        "image/heic",
      ]),
      validateBody(UserUpdateDTO),
      this.userUpdateController.userUpdate
    );
  };
  getRouter = () => {
    return this.router;
  };
}