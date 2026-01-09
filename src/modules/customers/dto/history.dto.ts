import {
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { OrderStatus } from "../../../generated/prisma/enums";

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
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  active?: boolean;
}
