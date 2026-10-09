import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') dotenv.config({ path: '.env.dev' });

import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD || process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: false,
  entities: ['./src/shared/infra/typeorm/schemas/*.js'],
  migrations: ['./src/shared/infra/typeorm/migrations/*.js'],
  migrationsRun: true,
  subscribers: [],
});
