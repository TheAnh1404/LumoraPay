import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Security
  app.use(helmet());
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5174',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api/v1`);
}

bootstrap().catch((error) => {
  console.error('Failed to start backend application', error);
  process.exit(1);
});
