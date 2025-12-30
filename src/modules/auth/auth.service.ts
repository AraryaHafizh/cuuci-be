import axios from "axios";
import { sign } from "jsonwebtoken";
import {
  BASE_URL_FE,
  JWT_SECRET,
  JWT_SECRET_RESET,
  JWT_SECRET_VERIFY,
} from "../../config/env";
import { GoogleUserPayload } from "../../types/google-user";
import { ApiError } from "../../utils/api-error";
import { comparePassword, hashPassword } from "../../utils/password";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { ForgotPasswordDTO } from "./dto/forgot-password.dto";
import { LoginDTO } from "./dto/login.dto";
import { RegisterDTO } from "./dto/register.dto";
import { ResetPasswordDTO } from "./dto/reset-password.dto";
import { Role } from "../../generated/prisma/enums";

export class AuthService {
  private prisma: PrismaService;
  private mailService: MailService;

  constructor() {
    this.prisma = new PrismaService();
    this.mailService = new MailService();
  }

  register = async (body: RegisterDTO) => {
    const exists = await this.prisma.user.findFirst({
      where: { email: body.email },
    });
    if (exists) throw new ApiError("email already exist", 400);

    const isVerified = body.role !== "CUSTOMER";
    const isAdmin = body.role === "OUTLET_ADMIN";

    const needsOutlet = ["WORKER", "DRIVER", "OUTLET_ADMIN"].includes(
      body.role as keyof typeof Role
    );
    if (needsOutlet && !body.outletId) {
      throw new ApiError("outletId is required", 400);
    }

    if (body.role === "WORKER" && !body.shift) {
      throw new ApiError("shift is required for worker", 400);
    }

    const hashedPassword = await hashPassword(body.password);

    await this.prisma.$transaction(async (tx) => {
      if (body.role === "OUTLET_ADMIN") {
        const outlet = await tx.outlet.findUnique({
          where: { id: body.outletId! },
        });

        if (outlet?.adminId) {
          throw new ApiError("Outlet already has an admin", 400);
        }
      }

      const user = await tx.user.create({
        data: {
          email: body.email,
          role: body.role,
          phoneNumber: body.phoneNumber,
          password: hashedPassword,
          name: body.name,
          emailVerified: isVerified,
          outletId: body.outletId,
          isOutletAdmin: isAdmin,
        },
      });

      switch (body.role) {
        case "CUSTOMER": {
          const token = sign(
            { id: user.id, type: "emailVerification" },
            JWT_SECRET_VERIFY!,
            { expiresIn: "5h" }
          );

          await this.mailService.sendEmail(
            body.email,
            "Please verify your email",
            "verify-email",
            { verificationUrl: `${BASE_URL_FE}/verify-email/${token}` }
          );
          break;
        }

        case "WORKER":
          await tx.worker.create({
            data: {
              workerId: user.id,
              outletId: body.outletId!,
              shift: body.shift!,
            },
          });
          break;

        case "DRIVER":
          await tx.driver.create({
            data: {
              driverId: user.id,
              outletId: body.outletId!,
            },
          });
          break;

        case "OUTLET_ADMIN":
          await tx.outlet.update({
            where: { id: body.outletId! },
            data: { adminId: user.id },
          });
          break;
      }
    });

    return { message: "register user success" };
  };

  emailVerification = async (authUserId: string) => {
    const user = await this.prisma.user.findFirst({
      where: { id: authUserId },
    });

    if (!user) throw new ApiError("User not found", 404);
    if (user.emailVerified) throw new ApiError("Email already verified", 400);

    await this.prisma.user.update({
      where: { id: authUserId },
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

    if (user.emailVerified === false) {
      throw new ApiError("Email not verified", 401);
    }

    const isPasswordValid = await comparePassword(
      body.password,
      user.password!
    );

    if (!isPasswordValid) {
      throw new ApiError("Invalid credentials", 400);
    }
    const payload = { id: user.id, role: user.role };

    const accessToken = sign(payload, JWT_SECRET!, { expiresIn: "12h" });

    const { password, ...userWithoutPassword } = user;

    return { ...userWithoutPassword, accessToken };
  };

  getGoogleProfile = async (accessToken: string) => {
    const { data } = await axios.get<GoogleUserPayload>(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return data;
  };

  loginByGoogle = async (body: any) => {
    const { accessToken } = body;

    const profile = await this.getGoogleProfile(accessToken);

    if (!profile.email_verified) {
      throw new ApiError("Email is not verified by Google", 400);
    }

    let user = await this.prisma.user.findFirst({
      where: { email: profile.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          password: "",
          profilePictureUrl: profile.picture,
          emailVerified: true,
          verifiedAt: new Date(),
          provider: "GOOGLE",
        },
      });
    }

    const payload = { id: user.id, role: user.role };

    const accessTokenJWT = sign(payload, JWT_SECRET!, { expiresIn: "2h" });

    const { password, ...userWithoutPassword } = user;

    return { ...userWithoutPassword, accessToken: accessTokenJWT };
  };

  refetch = async (id: string) => {
    const user = await this.prisma.user.findFirst({
      where: { id },
    });

    if (!user) {
      throw new ApiError("Invalid credentials", 400);
    }
    const payload = { id: user.id, role: user.role };

    const accessToken = sign(payload, JWT_SECRET!, { expiresIn: "12h" });

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
      "Reset Password",
      "reset-password",
      { link: `${BASE_URL_FE}/reset-password/${token}` }
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
