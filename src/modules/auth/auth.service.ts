import { sign } from "jsonwebtoken";
import { BASE_URL_FE, JWT_SECRET, JWT_SECRET_RESET } from "../../config/env";
import { ApiError } from "../../utils/api-error";
import { comparePassword, hashPassword } from "../../utils/password";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { ForgotPasswordDTO } from "./dto/forgot-password.dto";
import { LoginDTO } from "./dto/login.dto";
import { RegisterDTO } from "./dto/register.dto";
import { randomCodeGenerator } from "../../script/randomCodeGenerator";
import { ResetPasswordDTO } from "./dto/reset-password.dto";

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

    // check referral code (optional)
    let referredById: string | null = null;
    let referrer: any = null;
    if (body.referralCode) {
      referrer = await this.prisma.user.findFirst({
        where: { referralCode: body.referralCode },
      });
      if (!referrer) throw new ApiError("invalid referral code", 400);
      referredById = referrer.id;
    }

    const hashedPassword = await hashPassword(body.password);
    const userReferralCode = randomCodeGenerator();

    // create user akh
    const newUser = await this.prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        role: body.role,
        name: body.name,
        referralCode: userReferralCode,
        referredById, // may be null if not using referral
      },
    });

    if (referrer) {
      // create coupon code for referrer
      const couponCode = `REF-${Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()}`;
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await this.prisma.reward.create({
        data: {
          userId: referrer.id, // referrer receives reward
          triggeredById: newUser.id, // triggered by the new user
          couponCode,
          point: 0,
          expiresAt: expiry,
        },
      });

      // optionally give points to the new user (welcome bonus)
      await this.prisma.reward.create({
        data: {
          userId: newUser.id,
          triggeredById: referrer.id,
          point: 10000, // example welcome points
          expiresAt: expiry,
        },
      });
    }
    // await this.prisma.user.create({
    //   data: { ...body, password: hashedPassword, referralCode: userReferralCode },
    // });

    await this.mailService.sendEmail(
      body.email,
      "Welcome new user",
      "welcome",
      {}
    );

    return { message: "register user success" };
  };

  login = async (body: LoginDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    if (!user) {
      throw new ApiError("Invalid credentials", 400);
    }

    const isPasswordValid = await comparePassword(body.password, user.password);

    if (!isPasswordValid) {
      throw new ApiError("Invalid credentials", 400);
    }
    const payload = { id: user.id, role: user.role };

    const accessToken = sign(payload, JWT_SECRET!, { expiresIn: "2h" });

    const { password, ...userWithoutPassword } = user;

    return { ...userWithoutPassword, accessToken };
  };

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
      "Forgot Password",
      "reset-password",
      { link: `${BASE_URL_FE}/new-password/${token}` }
    );
  };

  resetPassword = async (body: ResetPasswordDTO, authUserId: string) => {
    const user = await this.prisma.user.findFirst({
      where: { id: authUserId },
    });

    if (!user) {
      throw new ApiError("invalid user id", 400);
    }

    const hashedPassword = await hashPassword(body.password);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { message: "reset password success" };
  };
}
