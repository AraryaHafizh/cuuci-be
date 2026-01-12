import { IsString } from "class-validator";

export class UserUpdatePasswordDTO {
  @IsString()
  oldPassword!: string;

  @IsString()
  newPassword!: string;
}
