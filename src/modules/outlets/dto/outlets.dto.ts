import { IsEnum, IsOptional, IsString } from "class-validator";
import { Role } from "../../../generated/prisma/enums";

export class outlets {
  @IsOptional()
  @IsString()
  search?: string;
}
