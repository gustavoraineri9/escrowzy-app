#!/usr/bin/env node
const ngrok = require("ngrok");

(async () => {
  try {
    const url = await ngrok.connect({ addr: 5000 });
    console.log("ngrok public URL:", url);
    console.log(`Webhook endpoint: ${url}/api/payments/webhook`);
    console.log("Keep this process running while testing webhooks. Ctrl+C to stop.");
  } catch (err) {
    console.error("Erro iniciando ngrok:", err);
    process.exit(1);
  }
})();
