import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movement } from './movement.entity';
import { MovementsController } from './movements.controller';
import { MovementsService } from './movements.service';
import { StockModule } from '../shared/stock/stock.module';

@Module({
  imports: [TypeOrmModule.forFeature([Movement]), StockModule],
  controllers: [MovementsController],
  providers: [MovementsService],
  exports: [MovementsService],
})
export class MovementsModule {}
