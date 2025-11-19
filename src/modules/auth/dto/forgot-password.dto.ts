import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class ForgotPasswordDTO {
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}
