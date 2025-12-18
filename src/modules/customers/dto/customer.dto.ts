import { IsOptional, IsString } from "class-validator";

export class customers {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
