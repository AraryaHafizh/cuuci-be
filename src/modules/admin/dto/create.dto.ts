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

export class CreateDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDTO)
  orderItems!: ItemDTO[];

  @IsInt()
  @IsPositive()
  totalPrice!: number;

  @IsInt()
  @IsPositive()
  totalWeight!: number;
}
