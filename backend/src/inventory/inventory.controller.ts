import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { FilterInventoryDto } from './dto/filter-inventory.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Query() filters: FilterInventoryDto) {
    return this.inventoryService.findAll(filters);
  }

  @Get('alerts/low-stock')
  findLowStockAlerts() {
    return this.inventoryService.findLowStockAlerts();
  }

  @Get('products/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.findOne(id);
  }
}
