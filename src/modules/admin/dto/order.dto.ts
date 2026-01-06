import { IsEnum, IsOptional, IsString } from "class-validator";
import { OrderStatus } from "../../../generated/prisma/enums";

export class orders {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
