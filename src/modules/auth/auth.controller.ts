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

  verifyEmail = async (req: Request, res: Response) => {
  const token = req.query.token as string;

  if (!token) {
    return res.status(400).send({ message: "Token is required" });
  }

  let payload;
  try {
    payload = verify(token, JWT_SECRET_VERIFY!) as { id: string };
  } catch (err) {
    return res.status(400).send({ message: "Invalid or expired token" });
  }

  const result = await this.authService.verifyEmail(payload.id);
  return res.status(200).send(result);
};

  login = async (req: Request, res: Response) => {
    const result = await this.authService.login(req.body);
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
