import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { verify } from "jsonwebtoken";
import { JWT_SECRET_VERIFY } from "../../config/env";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response) => {
    const result = await this.authService.register(req.body);
    res.status(200).send(result);
  };

  emailVerification = async (req: Request, res: Response) => {
    const authUserId = String(res.locals.user.id);
    const result = await this.authService.emailVerification(authUserId);
    return res.status(200).send(result);
  };

  login = async (req: Request, res: Response) => {
    const result = await this.authService.login(req.body);
    res.status(200).send(result);
  };

  loginByGoogle = async (req: Request, res: Response) => {
    const result = await this.authService.loginByGoogle(req.body);
    res.status(200).send(result);
  };

  forgotPassword = async (req: Request, res: Response) => {
    const result = await this.authService.forgotPassword(req.body);
    res.status(200).send(result);
  };

  resetPassword = async (req: Request, res: Response) => {
    const body = req.body;
    const authUserId = String(res.locals.user.id);
    const result = await this.authService.resetPassword(body, authUserId);
    res.status(200).send(result);
  };
}
