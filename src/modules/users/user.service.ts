import { ApiError } from "../../utils/api-error";
import { hashPassword } from "../../utils/password";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserUpdatePasswordDTO } from "./dto/user-update-password.dto";
import { UserUpdateDTO } from "./dto/user-update.dto";

export class UserUpdateService {
  private prisma: PrismaService;
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinaryService = new CloudinaryService();
  }

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

  userUpdatePassword = async (userId: string, body: UserUpdatePasswordDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) throw new ApiError("user not found", 404);

    const updateData: any = {};
    if (body.password) {
      const hashedPassword = await hashPassword(body.password);
      updateData.password = hashedPassword;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return { message: "update user success" };
  };

  deleteUser = async (userId: string) => {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  };
}
