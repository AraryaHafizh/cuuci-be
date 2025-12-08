import { IsEnum, IsNotEmpty } from "class-validator";
import { OrderStatus, Role } from "../../../generated/prisma/enums";

export class GetOrderDTO {
  @IsNotEmpty()
  @IsEnum(Role)
  role!: Role;

  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
