// src/modules/attendance/dto/attendance.dto.ts
import { Type } from "class-transformer";
import { IsOptional, IsString, IsDateString, IsInt, Min } from "class-validator";

export class CheckInDTO {}

export class CheckOutDTO {}

export class GetAttendanceLogDTO {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}




export class GetAttendanceReportDTO {
  @IsString()
  outletId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
