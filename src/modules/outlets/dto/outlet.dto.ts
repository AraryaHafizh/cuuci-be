import { IsBoolean, IsDate, IsOptional, IsString } from "class-validator";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";

export class OutletsDTO extends PaginationQueryParams {
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
  isHistory?: boolean = true;

  @IsOptional()
  @IsString()
  outletId?: string;
}
