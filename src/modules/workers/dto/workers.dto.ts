import { IsOptional, IsString } from "class-validator";

export class workers {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
