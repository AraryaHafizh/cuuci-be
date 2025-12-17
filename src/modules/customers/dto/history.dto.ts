import { IsOptional, IsString, IsBoolean, IsDateString } from "class-validator";
import { Type } from "class-transformer";

export class History {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  active?: boolean;
}
