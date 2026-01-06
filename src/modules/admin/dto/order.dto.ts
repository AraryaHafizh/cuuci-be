import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { OrderStatus } from "../../../generated/prisma/enums";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";

export class Orders extends PaginationQueryParams {
  @IsOptional()
  @IsString()
  search: string = "";

  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  isHistory?: boolean;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
