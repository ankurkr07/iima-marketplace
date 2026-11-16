import { createApp } from './app';
import { env } from './config/env';
import { startNewListingsDigestScheduler } from './modules/mail/mail.service';

const app = createApp();
let stopDigestScheduler = () => {};

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `\n  IIMA Marketplace API · ready\n  → http://localhost:${env.port}/api/v1  (${env.nodeEnv})\n`,
  );
  stopDigestScheduler = startNewListingsDigestScheduler();
});

// Graceful shutdown
const shutdown = (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received — shutting down gracefully.`);
  stopDigestScheduler();
  server.close(() => process.exit(0));
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
