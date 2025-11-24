import { IsString } from "class-validator";

export class UserUpdateDTO {
  @IsString()
  name!: string;
}
