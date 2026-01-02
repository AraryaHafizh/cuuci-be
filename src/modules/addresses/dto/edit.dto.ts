import { IsBoolean, IsOptional, IsString } from "class-validator";

export class updateDTO {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  latitude?: string;

  @IsOptional()
  @IsString()
  longitude?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
