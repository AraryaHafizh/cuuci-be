import { IsBoolean, IsEmail, IsNotEmpty, IsString, IsUrl } from "class-validator";

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  sub!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  given_name!: string;

  @IsString()
  @IsNotEmpty()
  family_name!: string;

  @IsUrl()
  @IsNotEmpty()
  picture!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsBoolean()
  @IsNotEmpty()
  email_verified!: boolean;
}