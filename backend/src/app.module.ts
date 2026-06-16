import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { ProductsModule } from './products/products.module';
import { MovementsModule } from './movements/movements.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseConfig()),
    ProductsModule,
    MovementsModule,
    InventoryModule,
  ],
})
export class AppModule {}
