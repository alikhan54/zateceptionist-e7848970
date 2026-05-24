/**
 * Settings v2 Deep Audit — Phase 0 DISCOVERY (no assertions, no actions)
 *
 * Visits each of the 8 Settings pages, captures full-page screenshots to
 * .tmp_settings_v2/03_baseline_pre/, and dumps a JSON inventory of every
 * interactive element to .tmp_settings_v2/01_page_inventory.json.
 *
 * Same auth state as the May 23 spec (ACSFX). Does not modify any app code,
 * does not click any save buttons, does not touch DB.
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = path.resolve(__dirname, '..', '..', '.tmp_settings_v2');
const BASELINE = path.join(OUT_DIR, '03_baseline_pre');
const INVENTORY_PATH = path.join(OUT_DIR, '01_page_inventory.json');

if (!fs.existsSync(BASELINE)) fs.mkdirSync(BASELINE, { recursive: true });

interface PageInventory {
  page: string;
  url: string;
  title: string;
  h1: string[];
  h2: string[];
  inputs: Array<{ name: string; type: string; label: string; required: boolean; disabled: boolean; placeholder: string }>;
  selects: Array<{ name: string; label: string; options: number }>;
  textareas: Array<{ name: string; label: string; placeholder: string }>;
  buttons: Array<{ text: string; aria: string; type: string; disabled: boolean }>;
  toggles: number;
  modals_triggered_by: number;
  tabs: string[];
  internal_links: string[];
  external_links: string[];
  cards_count: number;
  has_loading_skeleton: boolean;
  has_empty_state_text: boolean;
  has_save_button: boolean;
  has_delete_button: boolean;
  has_confirm_modal_trigger: boolean;
}

// Per-test inventory write — accumulating in module-scope didn't survive
// Playwright's worker isolation. Each test writes its own JSON; afterAll aggregates.
const PER_PAGE_DIR = path.join(OUT_DIR, '.inventory_parts');
if (!fs.existsSync(PER_PAGE_DIR)) fs.mkdirSync(PER_PAGE_DIR, { recursive: true });

const PAGES = [
  { name: 'company_info', path: '/settings/business-profile/company' },
  { name: 'knowledge_base', path: '/settings/business-profile/knowledge' },
  { name: 'ai_training', path: '/settings/business-profile/training' },
  { name: 'integrations', path: '/settings/integrations' },
  { name: 'team', path: '/settings/team' },
  { name: 'billing', path: '/settings/billing' },
  { name: 'notifications', path: '/settings/notifications' },
  { name: 'outreach', path: '/settings/outreach' },
];

async function dismissTutorial(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('onboarding-completed', 'true');
  }).catch(() => {});
  const skipBtn = page.getByRole('button', { name: /Skip tutorial/i });
  if (await skipBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skipBtn.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await dismissTutorial(page);
});

for (const p of PAGES) {
  test(`Discovery: ${p.name}`, async ({ page }) => {
    await page.goto(p.path);
    await page.waitForLoadState('networkidle');
    await dismissTutorial(page);

    // Give react-query an extra tick to settle
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(BASELINE, `${p.name}_baseline.png`),
      fullPage: true,
    });

    const data = await page.evaluate(() => {
      const labelOf = (el: Element): string => {
        const id = el.getAttribute('id');
        if (id) {
          const lab = document.querySelector(`label[for="${id}"]`);
          if (lab && lab.textContent) return lab.textContent.trim();
        }
        const closest = el.closest('label');
        if (closest && closest.textContent) return closest.textContent.trim().slice(0, 80);
        const prev = el.previousElementSibling;
        if (prev && prev.tagName === 'LABEL' && prev.textContent) return prev.textContent.trim();
        return '';
      };

      const inputs = Array.from(document.querySelectorAll('input')).map((el: HTMLInputElement) => ({
        name: el.getAttribute('name') || el.id || '',
        type: 'input:' + (el.type || 'text'),
        label: labelOf(el),
        required: el.required,
        disabled: el.disabled,
        placeholder: el.placeholder || '',
      }));

      const selects = Array.from(document.querySelectorAll('select, [role=combobox]')).map((el) => ({
        name: el.getAttribute('name') || el.id || '',
        label: labelOf(el),
        options: el.querySelectorAll('option').length,
      }));

      const textareas = Array.from(document.querySelectorAll('textarea')).map((el: HTMLTextAreaElement) => ({
        name: el.getAttribute('name') || el.id || '',
        label: labelOf(el),
        placeholder: el.placeholder || '',
      }));

      const buttons = Array.from(document.querySelectorAll('button')).map((el: HTMLButtonElement) => ({
        text: (el.textContent || '').trim().slice(0, 80),
        aria: el.getAttribute('aria-label') || '',
        type: el.type || 'button',
        disabled: el.disabled,
      })).filter((b) => b.text || b.aria);

      const toggles = document.querySelectorAll('[role="switch"], input[type="checkbox"]').length;
      const modalsTriggered = document.querySelectorAll('[aria-haspopup="dialog"]').length;
      const tabs = Array.from(document.querySelectorAll('[role="tab"]')).map((el) => (el.textContent || '').trim());
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      const internalLinks = allLinks
        .map((a) => a.getAttribute('href') || '')
        .filter((h) => h.startsWith('/'));
      const externalLinks = allLinks
        .map((a) => a.getAttribute('href') || '')
        .filter((h) => h.startsWith('http'));

      const h1 = Array.from(document.querySelectorAll('h1')).map((el) => (el.textContent || '').trim());
      const h2 = Array.from(document.querySelectorAll('h2')).map((el) => (el.textContent || '').trim());

      const bodyText = (document.body.textContent || '').toLowerCase();
      const hasLoadingSkeleton =
        document.querySelectorAll('.animate-pulse, [class*="skeleton"], .lucide-loader-2.animate-spin').length > 0;
      const hasEmptyStateText =
        /no entries|no data|nothing here|get started|add your first|empty/i.test(bodyText);
      const hasSaveButton = buttons.some((b) => /^(save|save changes|save preferences|save settings)$/i.test(b.text.trim()));
      const hasDeleteButton = buttons.some((b) => /delete|remove|disconnect|revoke/i.test(b.text));
      const hasConfirmModalTrigger =
        document.querySelectorAll('[data-state="open"][role=alertdialog], [data-state="open"][role=dialog]').length > 0;

      return {
        title: document.title,
        h1, h2,
        inputs, selects, textareas, buttons,
        toggles, modalsTriggered, tabs,
        internalLinks, externalLinks,
        cardsCount: document.querySelectorAll('[class*="card"]').length,
        hasLoadingSkeleton, hasEmptyStateText, hasSaveButton, hasDeleteButton, hasConfirmModalTrigger,
      };
    });

    const entry: PageInventory = {
      page: p.name,
      url: page.url(),
      title: data.title,
      h1: data.h1,
      h2: data.h2,
      inputs: data.inputs,
      selects: data.selects,
      textareas: data.textareas,
      buttons: data.buttons,
      toggles: data.toggles,
      modals_triggered_by: data.modalsTriggered,
      tabs: data.tabs,
      internal_links: data.internalLinks,
      external_links: data.externalLinks,
      cards_count: data.cardsCount,
      has_loading_skeleton: data.hasLoadingSkeleton,
      has_empty_state_text: data.hasEmptyStateText,
      has_save_button: data.hasSaveButton,
      has_delete_button: data.hasDeleteButton,
      has_confirm_modal_trigger: data.hasConfirmModalTrigger,
    };
    fs.writeFileSync(path.join(PER_PAGE_DIR, `${p.name}.json`), JSON.stringify(entry, null, 2));

    // Page-level heading detection — record both h1 and h2 presence as
    // observations, no assertion (Team uses h2 not h1 — recorded as finding).
  });
}

test.afterAll(async () => {
  const files = fs.readdirSync(PER_PAGE_DIR).filter((f) => f.endsWith('.json'));
  const pages = files.map((f) => JSON.parse(fs.readFileSync(path.join(PER_PAGE_DIR, f), 'utf8')));
  fs.writeFileSync(
    INVENTORY_PATH,
    JSON.stringify({ generated_at: new Date().toISOString(), pages }, null, 2),
  );
  console.log(`[Discovery] Aggregated inventory written to ${INVENTORY_PATH} (${pages.length} pages)`);
});
