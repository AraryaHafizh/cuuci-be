import { IsBoolean, IsEmail, IsString, IsUrl } from "class-validator";

export class PaymentResponseDTO {
  @IsString()
  sub!: string;

  @IsString()
  name!: string;

  @IsString()
  given_name!: string;

  @IsString()
  family_name!: string;

  @IsUrl()
  picture!: string;

  @IsEmail()
  email!: string;

  @IsBoolean()
  email_verified!: boolean;
}
