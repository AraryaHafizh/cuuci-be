import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";
import {
  OrderWorkProcessStatus,
  Station,
} from "../../../generated/prisma/enums";

export class GetJobsDTO extends PaginationQueryParams {
  @IsOptional()
  @IsString()
  search: string = "";

  @IsOptional()
  @IsEnum(OrderWorkProcessStatus)
  status?: OrderWorkProcessStatus;

  @IsOptional()
  @IsEnum(Station)
  station?: Station;

  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  isHistory?: boolean;
}
