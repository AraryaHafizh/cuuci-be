import { IsEmail, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { Role } from "../../../generated/prisma/enums";

export class PushDTO {
  @IsNotEmpty()
  @IsEmail()
  title!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsString()
  receiverId!: string;

  @IsNotEmpty()
  @IsEnum(Role)
  role!: Role;
}
