import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movement } from '../../movements/movement.entity';
import { StockCalculatorService } from './stock-calculator.service';

@Module({
  imports: [TypeOrmModule.forFeature([Movement])],
  providers: [StockCalculatorService],
  exports: [StockCalculatorService],
})
export class StockModule {}
