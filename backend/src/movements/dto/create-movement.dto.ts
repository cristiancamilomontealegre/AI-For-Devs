import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  Max,
  Min,
} from 'class-validator';
import { MAX_QUANTITY } from '../../shared/constants/quantity-limits';
import { MovementType } from '../../shared/enums/movement-type.enum';
import { MovementReason } from '../../shared/enums/movement-reason.enum';

export class CreateMovementDto {
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @IsEnum(MovementType)
  @IsNotEmpty()
  type: MovementType;

  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY)
  quantity: number;

  @IsEnum(MovementReason)
  @IsNotEmpty()
  reason: MovementReason;
}
