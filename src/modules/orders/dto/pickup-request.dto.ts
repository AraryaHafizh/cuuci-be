import { IsArray, IsNotEmpty, IsString } from "class-validator";

export class PickupRequestDTO {
  @IsNotEmpty()
  @IsString()
  address!: string;
}
