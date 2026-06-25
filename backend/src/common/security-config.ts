import { ConfigService } from '@nestjs/config';

export function requireJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();
  if (!secret || /^change_me/i.test(secret)) {
    throw new Error('JWT_SECRET tanımlı ve güvenli bir değer olmalıdır.');
  }
  return secret;
}

// The site's own domain (frontend hosted here, calling the Railway API).
// Always allowed in production so the live site works even if the CORS_ORIGINS
// env var is missing; extra origins can still be added via CORS_ORIGINS.
const PRODUCTION_ORIGINS = [
  'https://geliyokuryehizmetleri.com',
  'https://www.geliyokuryehizmetleri.com',
];

export function resolveCorsOrigins(config: ConfigService): string[] {
  const configured = (config.get<string>('CORS_ORIGINS')?.split(',') ?? [])
    .map((origin) => origin.trim())
    .filter((origin) => origin && !/change_me/i.test(origin));

  const environment = config.get<string>('APP_ENV') ?? config.get<string>('NODE_ENV');
  if (environment === 'production') {
    // Known production domain(s) + any extras configured via CORS_ORIGINS.
    return [...new Set([...PRODUCTION_ORIGINS, ...configured])];
  }

  // Local development: Vite dev server (5173/5174) plus any configured extras.
  return [
    ...new Set([
      ...configured,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ]),
  ];
}
