import { ConfigService } from '@nestjs/config';

export function requireJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();
  if (!secret || /^change_me/i.test(secret)) {
    throw new Error('JWT_SECRET tanımlı ve güvenli bir değer olmalıdır.');
  }
  return secret;
}

export function resolveCorsOrigins(config: ConfigService): string[] {
  const configured = config
    .get<string>('CORS_ORIGINS')
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured?.length && !configured.some((origin) => /change_me/i.test(origin))) {
    return configured;
  }

  const environment = config.get<string>('APP_ENV') ?? config.get<string>('NODE_ENV');
  if (environment === 'production') {
    throw new Error('Production ortamında CORS_ORIGINS tanımlanmalıdır.');
  }

  // Vite increments to 5174 when 5173 is already occupied during local work.
  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ];
}
