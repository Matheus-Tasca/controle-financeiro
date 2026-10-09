import { AppDataSource } from './shared/infra/typeorm/data-source.js';
import App from './app.js';
import { connectRedis, redisClient } from './shared/infra/auth/redis.js';

const port = 8080;

try {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.DB_PASSWORD ||
      !process.env.DB_USER ||
      !process.env.DB_NAME ||
      !process.env.REDIS_URL)
  ) {
    throw new Error('Production database and Redis settings are required');
  }
  await AppDataSource.initialize();
  await connectRedis();
  App.listen(port, () => {
    console.log(`Server initialized on port: ${port}`);
  });
} catch (error) {
  console.error('ERROR IN INIT SERVER!', error);
  if (AppDataSource.isInitialized)
    await AppDataSource.destroy().catch(() => {});
  if (redisClient.isOpen) await redisClient.quit().catch(() => {});
  process.exitCode = 1;
}
