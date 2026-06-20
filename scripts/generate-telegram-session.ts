import 'dotenv/config';

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

async function promptRequired(question: string): Promise<string> {
  const answer = (await rl.question(question)).trim();

  if (!answer) {
    throw new Error(`Required value is empty: ${question}`);
  }

  return answer;
}

const rl = createInterface({ input, output });

async function main(): Promise<void> {
  const apiIdRaw = process.env.TELEGRAM_API_ID || (await promptRequired('Telegram API ID: '));
  const apiHash = process.env.TELEGRAM_API_HASH || (await promptRequired('Telegram API HASH: '));
  const apiId = Number(apiIdRaw);

  if (!Number.isSafeInteger(apiId) || apiId <= 0) {
    throw new Error('TELEGRAM_API_ID must be a positive integer');
  }

  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: () => promptRequired('Phone number with country code: '),
    phoneCode: () => promptRequired('Telegram code: '),
    password: (hint?: string) =>
      promptRequired(hint ? `2FA password (${hint}): ` : '2FA password: '),
    onError: (error) => {
      console.error(error);
    },
  });

  console.log('\nTELEGRAM_SESSION=');
  console.log(session.save());

  await client.disconnect();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
  });
