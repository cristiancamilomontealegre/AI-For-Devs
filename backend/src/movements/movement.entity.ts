import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { MovementType } from '../shared/enums/movement-type.enum';
import { MovementReason } from '../shared/enums/movement-reason.enum';
import { Product } from '../products/product.entity';

@Entity('movements')
export class Movement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', type: 'int', nullable: false })
  productId: number;

  @ManyToOne(() => Product, (product) => product.movements, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({
    type: 'enum',
    enum: MovementType,
    nullable: false,
  })
  type: MovementType;

  @Column({ type: 'int', nullable: false })
  quantity: number;

  @Column({
    type: 'enum',
    enum: MovementReason,
    nullable: false,
  })
  reason: MovementReason;

  @CreateDateColumn({ name: 'occurred_at' })
  occurredAt: Date;
}
