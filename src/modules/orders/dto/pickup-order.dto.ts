import { IsDate, IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class PickupOrderDTO {
  @IsNotEmpty()
  @IsString()
  addressId!: string;

  @IsNotEmpty()
  @IsString()
  outletId!: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsDateString()
  pickupTime!: Date
}
