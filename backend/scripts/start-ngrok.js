#!/usr/bin/env node
/**
 * Simple helper to start ngrok and print the public URL for the webhook.
 * Usage: from backend folder run `node scripts/start-ngrok.js` (after `npm install`).
 */
const ngrok = require("ngrok");

async function main() {
  try {
    const url = await ngrok.connect({ addr: 5000 });
    console.log("ngrok public URL:", url);
    console.log(`Webhook endpoint (example): ${url}/api/payments/webhook`);
    console.log("Keep this process running while testing webhooks. Press Ctrl+C to stop.");
  } catch (err) {
    console.error("Erro iniciando ngrok:", err);
    process.exit(1);
  }
}

main();
