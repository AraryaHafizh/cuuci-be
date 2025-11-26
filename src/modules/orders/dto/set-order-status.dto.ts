import { IsEnum, IsNotEmpty } from "class-validator";
import { OrderStatus } from "../../../generated/prisma/enums";

export class SetOrderStatus {
    @IsNotEmpty()
    @IsEnum(OrderStatus)
    status!: OrderStatus;
}