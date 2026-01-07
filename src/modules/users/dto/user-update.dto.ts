import { IsOptional, IsString } from "class-validator";

export class UserUpdateDTO {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
