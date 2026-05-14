import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { User } from './modules/users/user.entity';
import { Role } from './common/enums/roles.enum';

function normalizeUsername(value: string) {
  const normalized = value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
    .toLowerCase();

  return (normalized || 'usuario').slice(0, 40);
}

async function buildUniqueUsername(usersRepo: Repository<User>, base: string, excludeUserId?: string) {
  const normalizedBase = normalizeUsername(base);
  let candidate = normalizedBase;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await usersRepo.findOne({ where: { username: candidate } });
    if (!existing || existing.id === excludeUserId) return candidate;

    const suffix = `.${counter}`;
    candidate = `${normalizedBase.slice(0, 40 - suffix.length)}${suffix}`;
    counter += 1;
  }
}

async function ensureDefaultAdmin(app: Awaited<ReturnType<typeof NestFactory.create>>) {
  const usersRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const usersWithoutUsername = await usersRepo.find({ where: { username: IsNull() } });

  for (const user of usersWithoutUsername) {
    user.username = await buildUniqueUsername(
      usersRepo,
      user.full_name || user.email.split('@')[0],
      user.id,
    );
    await usersRepo.save(user);
  }

  const existingAdmin = await usersRepo.findOne({ where: { username: 'admin' } });

  if (existingAdmin) {
    if (!existingAdmin.username) {
      existingAdmin.username = 'admin';
      await usersRepo.save(existingAdmin);
    }
    return;
  }

  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const user = usersRepo.create({
    username: 'admin',
    email: 'admin@sistema-condominio.local',
    password_hash: passwordHash,
    full_name: 'Administrador Inicial',
    role: Role.ADMIN,
    is_active: true,
  });

  await usersRepo.save(user);
  console.log('Usuario administrador inicial creado: admin / Admin123!');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Sistema de Condominios API')
    .setDescription('API REST para gestión de condominios')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await ensureDefaultAdmin(app);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Aplicación corriendo en: http://localhost:${port}/api`);
  console.log(`Documentación: http://localhost:${port}/api/docs`);
}
bootstrap();