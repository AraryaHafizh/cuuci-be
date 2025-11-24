import { IsOptional, IsString } from "class-validator";

export class UserUpdatePasswordDTO {
//   @IsOptional()
  @IsString()
  password!: string;
}
