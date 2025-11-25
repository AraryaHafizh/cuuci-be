import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString
} from "class-validator";

class PickupOrderItem {
  @IsOptional()
  @IsString()
  qty?: string;

  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @IsOptional()
  @IsNumber()
  totalWeight?: number;
}

export class CreatePickupOrder {
  @IsNotEmpty()
  @IsString()
  address!: string;

  @IsNotEmpty()
  @IsString()
  outletId!: string;

  //pickupTime: Date
  //notes: string
}
