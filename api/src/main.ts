import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Toutes les routes sont préfixées par /api (Caddy proxifie /api → ici)
  app.setGlobalPrefix('api');

  // Sécurité de base
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });

  // Validation + nettoyage automatique des DTO
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  // Documentation OpenAPI → sert aussi à générer le client TypeScript du front
  const config = new DocumentBuilder()
    .setTitle('Salon de la Danse — API bénévoles')
    .setDescription('Gestion des bénévoles : auth, planning, back-office')
    .setVersion('0.1.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000, '0.0.0.0');
  console.log('API prête sur http://localhost:3000/api');
}
bootstrap();
