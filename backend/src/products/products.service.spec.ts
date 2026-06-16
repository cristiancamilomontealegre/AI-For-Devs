import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './product.entity';
import { Movement } from '../movements/movement.entity';
import { ProductStatus } from '../shared/enums/product-status.enum';
import { UnitOfMeasure } from '../shared/enums/unit-of-measure.enum';
import { ErrorMessages } from '../shared/constants/error-messages';
import { createRepositoryMock, createQueryBuilderMock } from '../test-utils/typeorm-mocks';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: ReturnType<typeof createRepositoryMock<Product>>;
  let movementRepository: ReturnType<typeof createRepositoryMock<Movement>>;

  const activeProduct: Product = {
    id: 1,
    sku: 'SKU-001',
    name: 'Widget',
    description: 'Test product',
    price: 19.99,
    minimumStock: 5,
    category: 'General',
    unitOfMeasure: UnitOfMeasure.UNITS,
    status: ProductStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    movements: [],
  };

  beforeEach(async () => {
    productRepository = createRepositoryMock<Product>();
    movementRepository = createRepositoryMock<Movement>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: getRepositoryToken(Movement), useValue: movementRepository },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('create', () => {
    it('creates a product successfully with default minimumStock and active status', async () => {
      const dto = {
        sku: 'SKU-NEW',
        name: 'New Product',
        category: 'Electronics',
        price: 10,
      };

      productRepository.findOne.mockResolvedValue(null);
      productRepository.save.mockImplementation(async (product) => ({
        ...product,
        id: 2,
      }));

      const result = await service.create(dto);

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { sku: dto.sku },
      });
      expect(productRepository.create).toHaveBeenCalledWith({
        ...dto,
        minimumStock: 0,
        unitOfMeasure: UnitOfMeasure.UNITS,
        status: ProductStatus.ACTIVE,
      });
      expect(result.id).toBe(2);
      expect(result.status).toBe(ProductStatus.ACTIVE);
    });

    it('throws ConflictException when SKU already exists', async () => {
      productRepository.findOne.mockResolvedValue(activeProduct);

      await expect(
        service.create({
          sku: activeProduct.sku,
          name: 'Duplicate',
          price: 5,
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.create({
          sku: activeProduct.sku,
          name: 'Duplicate',
          price: 5,
        }),
      ).rejects.toThrow(ErrorMessages.SKU_ALREADY_EXISTS);

      expect(productRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateState', () => {
    it('deactivates an active product', async () => {
      productRepository.findOne.mockResolvedValue({ ...activeProduct });
      productRepository.save.mockImplementation(async (product) => product);

      const result = await service.updateState(1, {
        status: ProductStatus.INACTIVE,
      });

      expect(productRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result.status).toBe(ProductStatus.INACTIVE);
      expect(productRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.INACTIVE }),
      );
    });
  });

  describe('remove', () => {
    it('throws ConflictException when product has associated movements', async () => {
      productRepository.findOne.mockResolvedValue(activeProduct);
      movementRepository.count.mockResolvedValue(3);

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
      await expect(service.remove(1)).rejects.toThrow(
        ErrorMessages.PRODUCT_HAS_MOVEMENTS,
      );
      expect(movementRepository.count).toHaveBeenCalledWith({
        where: { productId: activeProduct.id },
      });
      expect(productRepository.remove).not.toHaveBeenCalled();
    });

    it('removes product when it has no movements', async () => {
      productRepository.findOne.mockResolvedValue(activeProduct);
      movementRepository.count.mockResolvedValue(0);
      productRepository.remove.mockResolvedValue(activeProduct);

      await service.remove(1);

      expect(movementRepository.count).toHaveBeenCalledWith({
        where: { productId: activeProduct.id },
      });
      expect(productRepository.remove).toHaveBeenCalledWith(activeProduct);
    });
  });

  describe('findOne', () => {
    it('returns product when found by id', async () => {
      productRepository.findOne.mockResolvedValue(activeProduct);

      const result = await service.findOne(1);

      expect(productRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(activeProduct);
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        ErrorMessages.PRODUCT_NOT_FOUND(999),
      );
    });
  });

  describe('findAll', () => {
    it('returns products ordered by createdAt descending', async () => {
      const qb = createQueryBuilderMock<Product>();
      const products = [activeProduct];
      qb.getMany.mockResolvedValue(products);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({});

      expect(productRepository.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(qb.orderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
      expect(result).toEqual(products);
    });
  });

  describe('update', () => {
    it('updates mutable fields without changing sku', async () => {
      productRepository.findOne.mockResolvedValue({ ...activeProduct });
      productRepository.save.mockImplementation(async (product) => product);

      const result = await service.update(1, {
        name: 'Updated name',
        price: 25,
      });

      expect(result.name).toBe('Updated name');
      expect(result.price).toBe(25);
      expect(result.sku).toBe(activeProduct.sku);
    });
  });
});
