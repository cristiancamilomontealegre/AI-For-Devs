import { getDatabaseConfig } from './database.config';

describe('getDatabaseConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.DB_SYNCHRONIZE;
    delete process.env.NODE_ENV;
    delete process.env.DB_SSL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses local defaults when DATABASE_URL is not set', () => {
    const config = getDatabaseConfig();

    expect(config).toMatchObject({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'inventario',
      synchronize: true,
    });
  });

  it('parses DATABASE_URL and enables ssl for managed postgres', () => {
    process.env.DATABASE_URL =
      'postgresql://render-user:render-pass@dpg-test-a.oregon-postgres.render.com:5432/inventario';

    const config = getDatabaseConfig();

    expect(config).toMatchObject({
      host: 'dpg-test-a.oregon-postgres.render.com',
      port: 5432,
      username: 'render-user',
      password: 'render-pass',
      database: 'inventario',
      ssl: { rejectUnauthorized: false },
    });
  });

  it('keeps synchronize disabled in production unless DB_SYNCHRONIZE=true', () => {
    process.env.NODE_ENV = 'production';

    expect(getDatabaseConfig().synchronize).toBe(false);

    process.env.DB_SYNCHRONIZE = 'true';
    expect(getDatabaseConfig().synchronize).toBe(true);
  });
});
