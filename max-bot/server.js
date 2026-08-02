// Legacy webhook server kept for reference. Disabled by default because
// the canonical bot entrypoint is `bot.js` (long-polling). To run a
// webhook server instead, set WEBHOOK_ENABLED=1 and provide WEBHOOK_URL.

import express from 'express';
import { BOT_CONFIG } from './src/config.js';

const app = express();
app.use(express.json());

app.get('/', (_req, res) => res.send('🤖 InfoPulse legacy webhook — use bot.js'));

if (process.env.WEBHOOK_ENABLED === '1' && process.env.WEBHOOK_URL) {
  app.post('/webhook', (req, res) => {
    console.log('webhook payload:', req.body);
    res.status(200).send('OK');
  });

  const PORT = process.env.WEBHOOK_PORT || 3001;
  app.listen(PORT, () =>
    console.log(`🚀 Webhook server on :${PORT} → ${process.env.WEBHOOK_URL}`),
  );
} else {
  console.log(
    'ℹ️  server.js loaded in stub mode (set WEBHOOK_ENABLED=1 to run a real webhook).',
  );
}

// Prevent unused import warning when in stub mode.
void BOT_CONFIG;
