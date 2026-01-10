import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString
} from "class-validator";
import {
  OrderStatus
} from "../../../generated/prisma/enums";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";

export class GetHistoryDTO extends PaginationQueryParams {
  @IsOptional()
  @IsString()
  search: string = "";
  
  @IsOptional()
  @IsString()
  type?: string = "";

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;
}
