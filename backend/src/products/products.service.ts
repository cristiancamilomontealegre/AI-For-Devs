import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Movement } from '../movements/movement.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStateDto } from './dto/update-product-state.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import { ProductStatus } from '../shared/enums/product-status.enum';
import { UnitOfMeasure } from '../shared/enums/unit-of-measure.enum';
import { ErrorMessages } from '../shared/constants/error-messages';
import { applyProductFilters } from '../shared/utils/apply-product-filters';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Movement)
    private readonly movementRepository: Repository<Movement>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const existing = await this.productRepository.findOne({
      where: { sku: dto.sku },
    });

    if (existing) {
      throw new ConflictException(ErrorMessages.SKU_ALREADY_EXISTS);
    }

    const product = this.productRepository.create({
      ...dto,
      minimumStock: dto.minimumStock ?? 0,
      unitOfMeasure: dto.unitOfMeasure ?? UnitOfMeasure.UNITS,
      status: ProductStatus.ACTIVE,
    });

    return this.productRepository.save(product);
  }

  async findAll(filters: FilterProductsDto): Promise<Product[]> {
    const query = applyProductFilters(
      this.productRepository.createQueryBuilder('product'),
      filters,
    );

    return query.orderBy('product.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(ErrorMessages.PRODUCT_NOT_FOUND(id));
    }

    return product;
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async updateState(id: number, dto: UpdateProductStateDto): Promise<Product> {
    const product = await this.findOne(id);
    product.status = dto.status;
    return this.productRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);

    const movementCount = await this.movementRepository.count({
      where: { productId: product.id },
    });

    if (movementCount > 0) {
      throw new ConflictException(ErrorMessages.PRODUCT_HAS_MOVEMENTS);
    }

    await this.productRepository.remove(product);
  }
}
