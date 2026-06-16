import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductStatus } from '../shared/enums/product-status.enum';
import { UnitOfMeasure } from '../shared/enums/unit-of-measure.enum';
import { Movement } from '../movements/movement.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  sku: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
  price: number;

  @Column({ name: 'minimum_stock', type: 'int', default: 0 })
  minimumStock: number;

  @Column({ type: 'varchar', length: 100, nullable: false, default: 'General' })
  category: string;

  @Column({
    name: 'unit_of_measure',
    type: 'enum',
    enum: UnitOfMeasure,
    default: UnitOfMeasure.UNITS,
  })
  unitOfMeasure: UnitOfMeasure;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Movement, (movement) => movement.product)
  movements: Movement[];
}
