import { Router } from "express";
import { AuthController } from "./auth.controller";
import { RegisterDTO } from "./dto/register.dto";
import { LoginDTO } from "./dto/login.dto";
import { ForgotPasswordDTO } from "./dto/forgot-password.dto";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import {
  JWT_SECRET,
  JWT_SECRET_RESET,
  JWT_SECRET_VERIFY,
} from "../../config/env";
import { ResetPasswordDTO } from "./dto/reset-password.dto";
import { validateBody } from "../../middlewares/validation.middleware";
import { GoogleLoginDto } from "./dto/google-login.dto";

export class AuthRouter {
  private router: Router;
  private authController: AuthController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.authController = new AuthController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.post(
      "/register",
      validateBody(RegisterDTO),
      this.authController.register
    );
    this.router.patch(
      "/email-verification",
      this.jwtMiddleware.verifyToken(JWT_SECRET_VERIFY!),
      this.authController.emailVerification
    );
    this.router.post(
      "/login",
      validateBody(LoginDTO),
      this.authController.login
    );
    this.router.post("/google", this.authController.loginByGoogle);
    this.router.get(
      "/refetch",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.authController.refetch
    );
    this.router.post(
      "/forgot-password",
      validateBody(ForgotPasswordDTO),
      this.authController.forgotPassword
    );
    this.router.patch(
      "/reset-password",
      this.jwtMiddleware.verifyToken(JWT_SECRET_RESET!),
      validateBody(ResetPasswordDTO),
      this.authController.resetPassword
    );
  };

  getRouter = () => {
    return this.router;
  };
}
