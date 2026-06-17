import { z } from 'zod';

const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
    }

    return false;
  });

const enabledModulesFromEnv = z
  .string()
  .default('telegram')
  .transform((value) =>
    value
      .split(',')
      .map((moduleName) => moduleName.trim())
      .filter(Boolean),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://leadhunter:leadhunter@localhost:5432/leadhunter?schema=public'),
  ENABLED_MODULES: enabledModulesFromEnv,
  TELEGRAM_ENABLED: booleanFromEnv.default(true),
  TELEGRAM_API_ID: z.string().optional(),
  TELEGRAM_API_HASH: z.string().optional(),
  TELEGRAM_SESSION: z.string().optional(),
});

export type Environment = z.infer<typeof envSchema>;

export interface AppConfig {
  env: Environment['NODE_ENV'];
  server: {
    host: string;
    port: number;
  };
  logger: {
    level: Environment['LOG_LEVEL'];
    pretty: boolean;
  };
  database: {
    url: string;
  };
  modules: {
    enabled: string[];
    telegram: {
      enabled: boolean;
      apiId?: string;
      apiHash?: string;
      session?: string;
    };
  };
}

export function parseConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.parse(env);

  return {
    env: parsed.NODE_ENV,
    server: {
      host: parsed.HOST,
      port: parsed.PORT,
    },
    logger: {
      level: parsed.LOG_LEVEL,
      pretty: parsed.NODE_ENV === 'development',
    },
    database: {
      url: parsed.DATABASE_URL,
    },
    modules: {
      enabled: parsed.ENABLED_MODULES,
      telegram: {
        enabled: parsed.TELEGRAM_ENABLED || parsed.ENABLED_MODULES.includes('telegram'),
        apiId: parsed.TELEGRAM_API_ID,
        apiHash: parsed.TELEGRAM_API_HASH,
        session: parsed.TELEGRAM_SESSION,
      },
    },
  };
}
