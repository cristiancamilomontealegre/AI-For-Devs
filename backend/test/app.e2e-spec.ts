import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/shared/filters/http-exception.filter';

describe('Inventory API (e2e)', () => {
  let app: INestApplication<App>;
  let productId: number;
  const sku = `E2E-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/products creates a product', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/products')
      .send({
        sku,
        name: 'E2E Widget',
        category: 'Electronics',
        unitOfMeasure: 'units',
        price: 19.99,
        minimumStock: 5,
      })
      .expect(201);

    productId = response.body.id;
    expect(response.body.sku).toBe(sku);
    expect(response.body.status).toBe('active');
  });

  it('POST /api/products rejects duplicate SKU with 409', async () => {
    await request(app.getHttpServer())
      .post('/api/products')
      .send({
        sku,
        name: 'Duplicate',
        category: 'Electronics',
        price: 10,
      })
      .expect(409);
  });

  it('GET /api/inventory returns products with calculated stock', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/inventory')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const created = response.body.find(
      (item: { sku: string }) => item.sku === sku,
    );
    expect(created).toBeDefined();
    expect(created.currentStock).toBe(0);
    expect(created.hasMovements).toBe(false);
  });

  it('POST /api/movements registers inbound movement', async () => {
    await request(app.getHttpServer())
      .post('/api/movements')
      .send({
        productId,
        type: 'inbound',
        quantity: 10,
        reason: 'purchase',
      })
      .expect(201);
  });

  it('POST /api/movements rejects outbound with insufficient stock', async () => {
    await request(app.getHttpServer())
      .post('/api/movements')
      .send({
        productId,
        type: 'outbound',
        quantity: 50,
        reason: 'sale',
      })
      .expect(400);
  });

  it('POST /api/movements allows outbound equal to current stock', async () => {
    await request(app.getHttpServer())
      .post('/api/movements')
      .send({
        productId,
        type: 'outbound',
        quantity: 10,
        reason: 'sale',
      })
      .expect(201);
  });

  it('DELETE /api/products/:id returns 409 when product has movements', async () => {
    await request(app.getHttpServer())
      .delete(`/api/products/${productId}`)
      .expect(409);
  });

  it('GET /api/inventory/products/:id reflects zero stock after movements', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/inventory/products/${productId}`)
      .expect(200);

    expect(response.body.currentStock).toBe(0);
    expect(response.body.hasMovements).toBe(true);
  });

  it('GET /api/movements returns movement history with filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/movements')
      .query({ productId, type: 'inbound' })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].productId).toBe(productId);
    expect(response.body[0].type).toBe('inbound');
    expect(response.body[0].product).toBeDefined();
  });

  it('POST /api/products with negative minimumStock returns 400', async () => {
    await request(app.getHttpServer())
      .post('/api/products')
      .send({
        sku: `NEG-${Date.now()}`,
        name: 'Invalid minimum',
        category: 'General',
        price: 5,
        minimumStock: -1,
      })
      .expect(400);
  });
});
