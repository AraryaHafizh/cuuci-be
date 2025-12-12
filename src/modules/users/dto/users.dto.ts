import { IsEnum, IsOptional, IsString } from "class-validator";
import { Role } from "../../../generated/prisma/enums";

export class users {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
