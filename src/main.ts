import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as cluster from 'cluster';
import * as os from 'os';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(
      AppModule,
      { bufferLogs: true },
    );

    app.useLogger(app.get(PinoLogger));
    const configService = app.get(ConfigService);

    // Static Assets serving for uploaded documents
    app.useStaticAssets(join(process.cwd(), 'uploads'), {
      prefix: '/uploads',
    });

    // Security - registered as Express middleware
    app.use(helmet());



    app.enableCors({
      origin: configService.get<string>('CORS_ORIGIN', '*'),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });

    // Global settings
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Swagger Configuration
    const config = new DocumentBuilder()
      .setTitle('Backend API')
      .setDescription('The Backend API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    const port = configService.get<number>('PORT') || 3000;
    // Fastify requires listening on 0.0.0.0 for external network reachability (especially inside containers)
    await app.listen(port, '0.0.0.0');

    Logger.log(`Application is running on: ${await app.getUrl()}`, 'Bootstrap');
  } catch (error) {
    Logger.error(
      `Critical Bootstrap failure: ${error.message}`,
      error.stack,
      'Bootstrap',
    );
    process.exit(1);
  }
}

// Clustering for high-load (10M user handle)
// In production, horizontal scaling (Kubernetes) is preferred over local clustering,
// but local clustering helps maximize single-node performance.
const clusterModule = cluster as any;
const numCPUs = os.cpus().length;

if (clusterModule.isPrimary && process.env.NODE_ENV === 'production') {
  console.log(`Master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    clusterModule.fork();
  }

  clusterModule.on('exit', (worker: any) => {
    console.log(`worker ${worker.process.pid} died. forking a new one...`);
    clusterModule.fork();
  });
} else {
  bootstrap();
}
// Trigger dev watcher reload for database connection to lawaldb
