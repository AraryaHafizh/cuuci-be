import { IsBoolean, IsOptional, IsString } from "class-validator";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";

export class GetOrdersDTO extends PaginationQueryParams {
  @IsOptional()
  @IsString()
  search: string = "";

  @IsOptional()
  @IsBoolean()
  isHistory?: boolean
}
