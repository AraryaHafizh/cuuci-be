import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { OrderStatus } from "../../../generated/prisma/enums";

export class DriverPickupDTO {
  @IsString()
  @IsNotEmpty()
  pickupOrderId!: string;

  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  outletId!: string;

  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
