import { ApiError } from "../../utils/api-error";
import { hashPassword } from "../../utils/password";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { OutletService } from "../outlets/outlet.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserUpdatePasswordDTO } from "./dto/user-update-password.dto";
import { UserUpdateDTO } from "./dto/user-update.dto";
import { users } from "./dto/users.dto";

export class UserUpdateService {
  private prisma: PrismaService;
  private cloudinaryService: CloudinaryService;
  private outletService: OutletService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinaryService = new CloudinaryService();
    this.outletService = new OutletService();
  }

  getUsers = async (query: users) => {
    const { id, outletId, name, role } = query;

    let where: any = {
      role: { not: "SUPER_ADMIN" },
    };

    if (id) where.id = id;
    if (outletId) where.outletId = outletId;
    if (name) where.name = { contains: name, mode: "insensitive" };
    if (role) where.role = role;

    const users = await this.prisma.user.findMany({
      where,
    });

    const filtered = await Promise.all(
      users.map(async (user) => {
        let outletName = "";
        if (user.role !== "CUSTOMER") {
          const outlet = await this.outletService.getOutlet(user.outletId!);
          outletName = outlet.data.name;
        }
        const { password, ...rest } = user;

        return {
          ...rest,
          outletName,
        };
      })
    );

    return { messae: "Users fetched suceessfully", data: filtered };
  };

  getUser = async (id: string) => {
    const user = await this.prisma.user.findFirst({ where: { id } });

    if (!user) throw new ApiError("User not found", 404);

    return {
      message: "User fetched successfully",
      data: user,
    };
  };

  userUpdate = async (
    id: string,
    body: UserUpdateDTO,
    profilePictureUrl?: Express.Multer.File
  ) => {
    const user = await this.prisma.user.findFirst({
      where: { id },
    });

    if (!user) throw new ApiError("user not found", 404);

    let imageUrl = user.profilePictureUrl;

    if (profilePictureUrl) {
      if (user.profilePictureUrl)
        await this.cloudinaryService.remove(user.profilePictureUrl);
      const { secure_url } = await this.cloudinaryService.upload(
        profilePictureUrl
      );
      imageUrl = secure_url;
    }

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    updateData.profilePictureUrl = imageUrl;

    await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return { message: "update user success" };
  };

  userUpdatePassword = async (id: string, body: UserUpdatePasswordDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { id },
    });

    if (!user) throw new ApiError("user not found", 404);

    const updateData: any = {};
    if (body.password) {
      const hashedPassword = await hashPassword(body.password);
      updateData.password = hashedPassword;
    }

    await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return { message: "update user success" };
  };
}
