import { IsString, IsOptional, IsNumber, IsEnum, IsEmail } from "class-validator";

export class XenditInvoiceWebhookDTO {
  @IsString()
  id!: string;

  @IsString()
  external_id!: string;

  @IsEnum(["PAID", "PENDING", "EXPIRED", "FAILED"])
  status!: "PAID" | "PENDING" | "EXPIRED" | "FAILED";

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsNumber()
  paid_amount?: number;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  payment_channel?: string;

  @IsOptional()
  @IsString()
  bank_code?: string;

  @IsOptional()
  @IsEmail()
  payer_email?: string;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  paid_at?: string;

  @IsString()
  created!: string;
}