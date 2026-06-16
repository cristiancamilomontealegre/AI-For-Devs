import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/product.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockModule } from '../shared/stock/stock.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), StockModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
