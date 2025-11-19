import { ApiError } from "../../utils/api-error";
import { hashPassword } from "../../utils/password";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { PrismaService } from "../prisma/prisma.service";
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
    profilePicture?: Express.Multer.File
  ) => {
    const user = await this.prisma.user.findFirst({
      where: { id },
    });

    if (!user) throw new ApiError("user not found", 404);

    let imageUrl = user.profilePicture;

    if (profilePicture) {
      if (user.profilePicture)
        await this.cloudinaryService.remove(user.profilePicture);
      const { secure_url } = await this.cloudinaryService.upload(
        profilePicture
      );
      imageUrl = secure_url;
    }

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.password) {
      const hashedPassword = await hashPassword(body.password);
      updateData.password = hashedPassword;
    }
    updateData.profilePicture = imageUrl;

    await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return { message: "update user success" };
  };
}
