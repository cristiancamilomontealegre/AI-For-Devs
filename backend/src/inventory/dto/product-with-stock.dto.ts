import { ProductStatus } from '../../shared/enums/product-status.enum';
import { UnitOfMeasure } from '../../shared/enums/unit-of-measure.enum';
export class ProductWithStockDto {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  minimumStock: number;
  category: string;
  unitOfMeasure: UnitOfMeasure;
  status: ProductStatus;
  currentStock: number;
  lowStockAlert: boolean;
  hasMovements: boolean;
  createdAt: Date;
  updatedAt: Date;
}
