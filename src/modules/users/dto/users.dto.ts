import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import { Role } from "../../../generated/prisma/enums";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";

export class Users extends PaginationQueryParams {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;
}
