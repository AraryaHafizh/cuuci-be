import { IsEnum, IsOptional, IsString } from "class-validator";
import { Role } from "../../../generated/prisma/enums";

export class users {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
