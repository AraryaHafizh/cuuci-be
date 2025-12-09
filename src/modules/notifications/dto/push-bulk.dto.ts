import { IsEmail, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { Role } from "../../../generated/prisma/enums";

export class PushBulkDTO {
  @IsNotEmpty()
  @IsEmail()
  title!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsString()
  outletId!: string;

  @IsNotEmpty()
  @IsEnum(Role)
  role!: Role;
}
