import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProductStatus } from '../../shared/enums/product-status.enum';

export class FilterProductsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
