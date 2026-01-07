import { IsDate, IsOptional } from "class-validator";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";

export class GetNotificationsDTO extends PaginationQueryParams {
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;
}
