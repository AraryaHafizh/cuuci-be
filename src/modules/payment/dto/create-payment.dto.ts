import { IsInt, isNumber, IsOptional, IsString } from "class-validator";

export class CreatePaymentDTO {
  @IsString()
  orderId!: string;
}
