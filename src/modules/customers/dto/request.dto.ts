import { Type } from "class-transformer";
import { IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class request {
  @IsString()
  @IsNotEmpty()
  addressId!: string;

  @IsString()
  @IsNotEmpty()
  outletId!: string;

  @IsNotEmpty()
  @IsDateString()
  @Type(() => Date)
  pickupDateTime!: Date;

  @IsOptional()
  @IsString()
  notes?: String;
}
