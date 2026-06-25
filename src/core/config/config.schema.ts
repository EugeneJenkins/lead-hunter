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

const commaSeparatedListFromEnv = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
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
  TELEGRAM_API_ID: z.coerce.number().int().positive().optional(),
  TELEGRAM_API_HASH: z.string().optional(),
  TELEGRAM_SESSION: z.string().optional(),
  TELEGRAM_CHATS: commaSeparatedListFromEnv,
  TELEGRAM_SYNC_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
  TELEGRAM_BATCH_SIZE: z.coerce.number().int().positive().max(3_000).default(100),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  OLLAMA_MODEL_NAME: z.string().default('qwen2.5:1.5b'),
  OLLAMA_LEAD_CLASSIFIER_PROMPT: z.string().default('You are a helpful assistant.'),
  OLLAMA_URL: z.string().url().default('http://127.0.0.1:11434'),
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
      apiId?: number;
      apiHash?: string;
      session?: string;
      chats: string[];
      syncIntervalMs: number;
      batchSize: number;
    };
  };
  workers: {
    concurrency: number;
  };
  ollama: {
    host: string;
    prompt: string;
    model: string;
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
        chats: parsed.TELEGRAM_CHATS,
        syncIntervalMs: parsed.TELEGRAM_SYNC_INTERVAL_MS,
        batchSize: parsed.TELEGRAM_BATCH_SIZE,
      },
    },
    workers: {
      concurrency: parsed.WORKER_CONCURRENCY,
    },
    ollama: {
      host: parsed.OLLAMA_URL,
      prompt: parsed.OLLAMA_LEAD_CLASSIFIER_PROMPT,
      model: parsed.OLLAMA_MODEL_NAME,
    },
  };
}
