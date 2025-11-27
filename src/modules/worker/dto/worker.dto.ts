// src/modules/worker/dto/worker.dto.ts
import {
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { Station } from "../../../generated/prisma/enums";

export class ProcessOrderItemDTO {
  @IsString()
  @IsNotEmpty()
  laundryItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ProcessOrderDTO {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProcessOrderItemDTO)
  items!: ProcessOrderItemDTO[];
}

export class GetWorkerOrdersDTO {
  @IsEnum(Station)
  station!: Station;
}
