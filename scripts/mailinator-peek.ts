/**
 * One-shot: load .env and call Mailinator inbox API (no secrets printed).
 * Usage: npx tsx scripts/mailinator-peek.ts
 */
import dotenv from 'dotenv';
import { MailinatorInbox } from '../lib/mailinator-provider';

dotenv.config();

async function main(): Promise<void> {
  const inbox = MailinatorInbox.fromEnv(process.argv[2] ?? 'playwright-peek-smoke');
  const peek = await inbox.debugPeekInbox();
  console.log('emailAddress:', inbox.emailAddress);
  console.log('peek:', JSON.stringify(peek, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
