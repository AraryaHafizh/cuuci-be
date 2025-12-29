import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class createDTO {
  @IsNotEmpty()
  @IsString()
  address!: string;

  @IsNotEmpty()
  @IsString()
  latitude!: string;

  @IsNotEmpty()
  @IsString()
  longitude!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
