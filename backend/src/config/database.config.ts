import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

function shouldSynchronizeSchema(): boolean {
  if (process.env.DB_SYNCHRONIZE === 'true') {
    return true;
  }

  if (process.env.DB_SYNCHRONIZE === 'false') {
    return false;
  }

  return process.env.NODE_ENV !== 'production';
}

function buildConfigFromUrl(databaseUrl: string): TypeOrmModuleOptions {
  const url = new URL(databaseUrl);

  return {
    type: 'postgres',
    host: url.hostname,
    port: Number(url.port || 5432),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    ssl: { rejectUnauthorized: false },
    autoLoadEntities: true,
    synchronize: shouldSynchronizeSchema(),
  };
}

function buildConfigFromEnv(): TypeOrmModuleOptions {
  const useSsl = process.env.DB_SSL === 'true';

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'inventario',
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    autoLoadEntities: true,
    synchronize: shouldSynchronizeSchema(),
  };
}

export function getDatabaseConfig(): TypeOrmModuleOptions {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    return buildConfigFromUrl(databaseUrl);
  }

  return buildConfigFromEnv();
}
