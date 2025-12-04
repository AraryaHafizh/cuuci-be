import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateDTO {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEmail()
  address!: string;

  @IsNotEmpty()
  @IsString()
  latitude!: string;

  @IsNotEmpty()
  @IsString()
  longitude!: string;

  @IsOptional()
  @IsString()
  adminId?: string;
}
