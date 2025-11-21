import { sign } from "jsonwebtoken";
import {
  BASE_URL_FE,
  JWT_SECRET,
  JWT_SECRET_RESET,
  JWT_SECRET_VERIFY,
} from "../../config/env";
import { ApiError } from "../../utils/api-error";
import { comparePassword, hashPassword } from "../../utils/password";
import { MailService } from "../mail/mail.service";
import { ForgotPasswordDTO } from "./dto/forgot-password.dto";
import { LoginDTO } from "./dto/login.dto";
import { RegisterDTO } from "./dto/register.dto";
import { ResetPasswordDTO } from "./dto/reset-password.dto";
import { PrismaService } from "../prisma/prisma.service";
import { VerifyEmailDTO } from "./dto/verify-email.dto";

export class AuthService {
  private prisma: PrismaService;
  private mailService: MailService;

  constructor() {
    this.prisma = new PrismaService();
    this.mailService = new MailService();
  }

  register = async (body: RegisterDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    if (user) {
      throw new ApiError("email already exist", 400);
    }

    const hashedPassword = await hashPassword(body.password);

    // create user akh
    const newUser = await this.prisma.user.create({
      data: {
        email: body.email,
        role: body.role,
        password: hashedPassword,
        name: body.name,
        emailVerified: false,
        verifiedAt: null,
      },
    });

    const payload = { id: newUser.id, type: "emailVerification" };
    const accessToken = sign(payload, JWT_SECRET_VERIFY!, {
      expiresIn: "5h",
    });

    await this.mailService.sendEmail(
      body.email,
      "Please verify your email",
      "verify-email",
      {
        verificationUrl: `${BASE_URL_FE}/verify-email?${accessToken}`, // masukin FE URL BLOOOOK
      }
    );

    return { message: "register user success" };
  };

  verifyEmail = async (userId: string) => {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new ApiError("User not found", 404);
    if (user.emailVerified) return { message: "Email already verified" };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        verifiedAt: new Date(),
      },
    });

    return { message: "Email verified successfully" };
  };

  login = async (body: LoginDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    if (!user) {
      throw new ApiError("Invalid credentials", 400);
    }

    const isPasswordValid = await comparePassword(
      body.password,
      user.password!
    );

    if (!isPasswordValid) {
      throw new ApiError("Invalid credentials", 400);
    }
    const payload = { id: user.id, role: user.role };

    const accessToken = sign(payload, JWT_SECRET!, { expiresIn: "2h" });

    const { password, ...userWithoutPassword } = user;

    return { ...userWithoutPassword, accessToken };
  };

  socialLogin = async () => {};

  forgotPassword = async (body: ForgotPasswordDTO) => {
    // cek dulu usernya ada apa tidak di db berdasarkan email
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    // kalo tidak ada throw error
    if (!user) {
      throw new ApiError("Invalid email address", 400);
    }

    // generate token
    const payload = { id: user.id, role: user.role };
    const token = sign(payload, JWT_SECRET_RESET!, { expiresIn: "15m" });

    // kirim email reset password + token
    await this.mailService.sendEmail(
      user.email,
      "Reset Password",
      "reset-password",
      { link: `${BASE_URL_FE}/new-password/${token}` }
    );

    return { message: "Send email success!" };
  };

  resetPassword = async (body: ResetPasswordDTO, authUserId: string) => {
    const user = await this.prisma.user.findFirst({
      where: { id: authUserId },
    });

    if (!user) {
      return "Send email success!";
    }

    const hashedPassword = await hashPassword(body.password);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { message: "reset password success" };
  };
}
