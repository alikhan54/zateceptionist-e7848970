import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diagnostic test: POST to /omega-chat directly via the browser's fetch() to
// confirm whether the frontend-origin can reach the webhook (rules out CORS
// vs slow-LangGraph vs anything else).
test('OMEGA browser-direct probe', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const out = await page.evaluate(async () => {
    const start = Date.now();
    try {
      const resp = await fetch('https://webhooks.zatesystems.com/webhook/omega-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': 'cosmique' },
        body: JSON.stringify({
          message: 'How many patients do I have?',
          channel: 'web_chat',
          tenant_id: 'cosmique',
          sender_identifier: 'admin@cosmique.zatesystems.com',
          sender_type: 'admin',
          tenant_uuid: '933967dd-1f90-4676-96c1-42a01b6d9835',
          timestamp: new Date().toISOString(),
        }),
      });
      const elapsed_ms = Date.now() - start;
      const status = resp.status;
      const body = await resp.text();
      return { ok: resp.ok, status, elapsed_ms, body_first_500: body.slice(0, 500) };
    } catch (e: any) {
      return { ok: false, error: e.message, elapsed_ms: Date.now() - start };
    }
  });

  const outPath = path.join(__dirname, 'phase4b-omega-direct-result.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('OMEGA browser-direct result:', JSON.stringify(out, null, 2));
});
