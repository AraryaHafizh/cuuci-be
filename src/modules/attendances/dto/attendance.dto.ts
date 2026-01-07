// src/modules/attendance/dto/attendance.dto.ts
import { IsOptional, IsString, IsDateString } from "class-validator";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";

export class CheckInDTO {}

export class CheckOutDTO {}

export class GetAttendanceLogDTO extends PaginationQueryParams {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  // string because your schema uses cuid() string IDs
  @IsOptional()
  @IsString()
  userId?: string;
}

export class GetAttendanceReportDTO {
  // outletId is a String cuid() in your schema
  @IsString()
  outletId!: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
