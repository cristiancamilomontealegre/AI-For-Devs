import { test, expect } from '@playwright/test';

const apiUrl = process.env.API_URL ?? 'http://localhost:3000/api';

const defaultProduct = {
  category: 'General',
  unitOfMeasure: 'units',
};

test.describe('Product creation form', () => {
  test('creates a product from the UI', async ({ page }) => {
    const sku = `PW-CREATE-${Date.now()}`;

    await page.goto('/products/new');
    await expect(page.getByRole('heading', { name: 'New Product' })).toBeVisible();
    await page.getByLabel('SKU').fill(sku);
    await page.getByLabel('Name').fill('Playwright Created Product');
    await page.getByLabel('Category').fill('Electronics');
    await page.getByLabel('Price').fill('29.99');
    await page.getByLabel('Minimum stock').fill('3');
    await page.getByRole('button', { name: 'Save product' }).click();

    await expect(page.getByText('Product created successfully.')).toBeVisible();
    await expect(page.getByText(sku)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Product inventory', () => {
  test('lists seeded products with stock badge', async ({ page, request }) => {
    const sku = `PW-LIST-${Date.now()}`;
    await request.post(`${apiUrl}/products`, {
      data: {
        sku,
        name: 'Playwright List Product',
        price: 12.5,
        minimumStock: 5,
        ...defaultProduct,
      },
    });

    await request.post(`${apiUrl}/movements`, {
      data: {
        productId: (
          await (
            await request.get(`${apiUrl}/inventory`)
          ).json()
        ).find((p: { sku: string }) => p.sku === sku).id,
        type: 'inbound',
        quantity: 3,
        reason: 'purchase',
      },
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Product Inventory' })).toBeVisible();
    await expect(page.getByText(sku)).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: '3 units' }).first()).toHaveClass(
      /stock-badge--danger/,
    );
  });

  test('opens movement form with product preselected from row action', async ({
    page,
    request,
  }) => {
    const sku = `PW-LINK-${Date.now()}`;
    await request.post(`${apiUrl}/products`, {
      data: {
        sku,
        name: 'Playwright Link Product',
        price: 10,
        minimumStock: 0,
        ...defaultProduct,
      },
    });

    await page.goto('/');
    await expect(page.getByText(sku)).toBeVisible();
    await page
      .getByRole('row')
      .filter({ hasText: sku })
      .getByRole('link', { name: 'Register movement' })
      .click();

    await expect(page.getByRole('heading', { name: 'New Movement' })).toBeVisible();
    await expect(page.getByLabel('Select product')).toHaveValue(
      new RegExp(`${sku} — Playwright Link Product`),
    );
  });
});

test.describe('Movement form', () => {
  test('registers inbound movement successfully', async ({ page, request }) => {
    const sku = `PW-IN-${Date.now()}`;
    const createResponse = await request.post(`${apiUrl}/products`, {
      data: {
        sku,
        name: 'Playwright Inbound Product',
        price: 8,
        minimumStock: 0,
        ...defaultProduct,
      },
    });
    const product = await createResponse.json();

    await page.goto('/movements/new');
    await page.getByLabel('Select product').fill(sku);
    await page.getByRole('option', { name: new RegExp(sku) }).click();
    await page.getByLabel('Inbound', { exact: true }).check();
    await page.getByLabel('Quantity').fill('4');
    await page.getByRole('button', { name: 'Save movement' }).click();

    await expect(page.getByText('Movement registered successfully.')).toBeVisible();

    const inventoryResponse = await request.get(
      `${apiUrl}/inventory/products/${product.id}`,
    );
    const inventory = await inventoryResponse.json();
    expect(inventory.currentStock).toBe(4);
  });

  test('blocks outbound movement when stock is insufficient', async ({ page, request }) => {
    const sku = `PW-OUT-${Date.now()}`;
    await request.post(`${apiUrl}/products`, {
      data: {
        sku,
        name: 'Playwright Outbound Product',
        price: 8,
        minimumStock: 0,
        ...defaultProduct,
      },
    });

    await page.goto('/movements/new');
    await page.getByLabel('Select product').fill(sku);
    await page.getByRole('option', { name: new RegExp(sku) }).click();
    await page.getByLabel('Outbound', { exact: true }).check();
    await page.getByLabel('Quantity').fill('5');
    await page.getByText('Insufficient stock').waitFor();

    await expect(page.getByRole('button', { name: 'Save movement' })).toBeDisabled();
  });
});

test.describe('Movement history', () => {
  test('shows registered movements with filters', async ({ page, request }) => {
    const sku = `PW-HIST-${Date.now()}`;
    const createResponse = await request.post(`${apiUrl}/products`, {
      data: {
        sku,
        name: 'Playwright History Product',
        price: 15,
        minimumStock: 0,
        ...defaultProduct,
      },
    });
    const product = await createResponse.json();

    await request.post(`${apiUrl}/movements`, {
      data: {
        productId: product.id,
        type: 'inbound',
        quantity: 7,
        reason: 'purchase',
      },
    });

    await page.goto('/movements');
    await expect(page.getByRole('heading', { name: 'Movement History' })).toBeVisible();

    const movementRow = page.getByRole('row').filter({
      has: page.locator('.movement-history__product-sku', { hasText: sku }),
    });

    await expect(movementRow).toBeVisible();
    await expect(movementRow.locator('.movement-history__type--inbound')).toHaveText(
      'Inbound',
    );
    await expect(movementRow.getByText('7 units')).toBeVisible();
  });
});
