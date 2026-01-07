import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  ValidateNested,
} from "class-validator";

export class ItemDTO {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsInt()
  @IsPositive()
  qty!: number;
}

export class ValidateDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDTO)
  orderItems!: ItemDTO[];
}
