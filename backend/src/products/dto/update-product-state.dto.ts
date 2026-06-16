import { IsEnum, IsNotEmpty } from 'class-validator';
import { ProductStatus } from '../../shared/enums/product-status.enum';

export class UpdateProductStateDto {
  @IsEnum(ProductStatus)
  @IsNotEmpty()
  status: ProductStatus;
}
