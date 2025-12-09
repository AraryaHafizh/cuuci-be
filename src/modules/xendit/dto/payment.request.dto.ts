import { IsString, IsNumber, IsOptional, IsUrl } from "class-validator";

export class PaymentRequestDTO {
  @IsString()
  external_id!: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  invoice_duration?: number;

  @IsOptional()
  @IsUrl()
  success_redirect_url?: string;

  @IsOptional()
  @IsUrl()
  failure_redirect_url?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
