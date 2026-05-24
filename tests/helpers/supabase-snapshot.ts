/**
 * Helper: take snapshots of Supabase rows for multi-tenant action isolation
 * verification. Uses the service-role key loaded from D:/420-system/.env
 * (which lives outside the repo).
 *
 * Used by settings-audit-isolation.spec.ts to prove that an action performed
 * as tenant A leaves zero delta on every other tenant's data.
 */

import fs from 'fs';
import path from 'path';

const ENV_PATH = path.resolve(process.cwd(), '..', '.env');
let SVC: string | null = null;
try {
  const envText = fs.readFileSync(ENV_PATH, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    if (line.startsWith('SUPABASE_SERVICE_KEY=')) {
      SVC = line.split('=', 1).length > 0 ? line.substring('SUPABASE_SERVICE_KEY='.length).trim() : null;
      break;
    }
  }
} catch (e) {
  // ignore — tests will skip if SVC is null
}

const REST = 'https://fncfbywkemsxwuiowxxe.supabase.co/rest/v1';

export function hasServiceKey(): boolean {
  return !!SVC;
}

async function get(pathAndQuery: string): Promise<unknown> {
  if (!SVC) throw new Error('SUPABASE_SERVICE_KEY not available — cannot snapshot');
  const r = await fetch(REST + pathAndQuery, {
    headers: { apikey: SVC, Authorization: 'Bearer ' + SVC },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

/**
 * Snapshot all rows in `table` matching the given column filter into a map
 * keyed by `keyCol`. Returns { [keyValue]: rowJson }. Used to compare before/
 * after action. The keyCol should be tenant_id or org_id depending on table.
 */
export async function snapshotByKey(
  table: string,
  keyCol: string,
  select: string = '*',
): Promise<Record<string, unknown>> {
  const rows = (await get(`/${table}?select=${select}`)) as Array<Record<string, unknown>>;
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    const k = row[keyCol];
    if (k != null) out[String(k)] = row;
  }
  return out;
}

/**
 * Count rows in `table` grouped by `keyCol`. Cheaper than full snapshot when
 * we only care about "did the row count change for any other tenant".
 */
export async function countByKey(
  table: string,
  keyCol: string,
): Promise<Record<string, number>> {
  const rows = (await get(`/${table}?select=${keyCol}`)) as Array<Record<string, unknown>>;
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const k = row[keyCol];
    if (k != null) {
      const key = String(k);
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Compare two row-keyed snapshots and return tenants whose rows differ.
 * The "expected delta key" is the tenant we EXPECTED to change (the actor).
 * Any other tenant appearing in the delta is a leak.
 */
export function diffSnapshots(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  expectedKey: string,
): { leakedKeys: string[]; actorChanged: boolean } {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const leakedKeys: string[] = [];
  let actorChanged = false;
  for (const k of allKeys) {
    const a = JSON.stringify(before[k] ?? null);
    const b = JSON.stringify(after[k] ?? null);
    if (a !== b) {
      if (k === expectedKey) actorChanged = true;
      else leakedKeys.push(k);
    }
  }
  return { leakedKeys, actorChanged };
}

/**
 * Same as diffSnapshots but for count maps.
 */
export function diffCounts(
  before: Record<string, number>,
  after: Record<string, number>,
  expectedKey: string,
): { leakedKeys: string[]; actorDelta: number } {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const leakedKeys: string[] = [];
  let actorDelta = 0;
  for (const k of allKeys) {
    const a = before[k] ?? 0;
    const b = after[k] ?? 0;
    if (a !== b) {
      if (k === expectedKey) actorDelta = b - a;
      else leakedKeys.push(k);
    }
  }
  return { leakedKeys, actorDelta };
}
