import { IsNotEmpty, IsString } from "class-validator";

export class nearestDTO {
  @IsNotEmpty()
  @IsString()
  latitude!: string;

  @IsNotEmpty()
  @IsString()
  longitude!: string;
}
