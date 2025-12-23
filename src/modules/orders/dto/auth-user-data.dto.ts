import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { Role } from "../../../generated/prisma/enums";

export class AuthUserDataDTO {
  @IsString()
  authUserId!: string;

  @IsEnum(Role)
  role!: Role;

  @IsString()
  @IsOptional()
  outletId?: string;
}
