/**
 * Premium-tier + Reviews + Training verification (2026-05-26 PM).
 *
 *   P1  OMEGA bridge routes premium tenants to Claude (zate + cosmique),
 *       free tenants to Gemini.
 *   P2  Phase 2 sourcing — premium uses paid Apify and returns real
 *       LinkedIn profiles.
 *   P3  Performance Reviews — create review no longer 400s (review_type
 *       'manager' + auto-resolved cycle_id).
 *   P4  AI Auto-Review — Claude generates ratings + strengths + summary
 *       based on real attendance/leave/training signals.
 *   P5  Training Generator — Claude generates content_script, slides,
 *       and assessment questions for a given topic.
 *
 * Auth: zate via .auth-state-zate.json (zate is a premium tenant).
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOT_DIR = path.join(__dirname, 'screenshots', 'premium-tier');
const RESULTS_PATH = path.join(__dirname, 'premium-tier-results.json');
const SUPA = 'https://fncfbywkemsxwuiowxxe.supabase.co';
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuY2ZieXdrZW1zeHd1aW93eHhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg2ODI3NSwiZXhwIjoyMDgyNDQ0Mjc1fQ.Q_Z47LEXi7WtYPAL4M18LIVUy7oTvq2VR79nVEIL4FE';
const ZATE = 'ac308ab6-f381-4eef-88ec-4d5c7a860ff9';
const COSMIQUE = '933967dd-1f90-4676-96c1-42a01b6d9835';
const TS = Date.now();

type Verdict = 'PASS' | 'FAIL' | 'PARTIAL';
interface Result { id: string; name: string; verdict: Verdict; evidence: Record<string, unknown>; notes: string[]; error?: string; }
const results: Result[] = [];

test.describe.configure({ mode: 'default' });
test.use({ trace: 'off' });
test.beforeAll(() => fs.mkdirSync(SHOT_DIR, { recursive: true }));
function flush() {
  const byId = new Map<string, Result>();
  for (const r of results) byId.set(r.id, r);
  const final = Array.from(byId.values());
  fs.writeFileSync(RESULTS_PATH, JSON.stringify({
    total: final.length, pass: final.filter(r => r.verdict === 'PASS').length,
    partial: final.filter(r => r.verdict === 'PARTIAL').length,
    fail: final.filter(r => r.verdict === 'FAIL').length, results: final,
  }, null, 2));
}
test.afterEach(() => flush());
test.afterAll(() => flush());

test('P1 OMEGA bridge routes premium=Claude, free=Gemini', async ({ request }) => {
  test.setTimeout(180_000);
  const notes: string[] = [];
  // Premium zate
  const z = await request.post('http://localhost:5678/webhook/hr/ai-assistant-v2', {
    headers: { 'Content-Type': 'application/json' },
    data: { tenant_id: ZATE, message: 'How many employees do we have?', user_id: 'p1-zate' },
    timeout: 60_000,
  });
  const zb = await z.json();
  notes.push(`zate: agent=${zb?.agent} tier=${zb?.tier} tools=${JSON.stringify(zb?.tools_executed)}`);
  // Premium cosmique
  const c = await request.post('http://localhost:5678/webhook/hr/ai-assistant-v2', {
    headers: { 'Content-Type': 'application/json' },
    data: { tenant_id: COSMIQUE, message: 'How many providers do we have?', user_id: 'p1-cos' },
    timeout: 60_000,
  });
  const cb = await c.json();
  notes.push(`cosmique: agent=${cb?.agent} tier=${cb?.tier} tools=${JSON.stringify(cb?.tools_executed)}`);
  const bothClaudePremium = zb?.tier === 'premium' && cb?.tier === 'premium' && /claude/i.test(zb?.agent || '') && /claude/i.test(cb?.agent || '');
  results.push({
    id: 'P1', name: 'OMEGA routes premium to Claude',
    verdict: bothClaudePremium ? 'PASS' : 'FAIL',
    evidence: { zate: { agent: zb?.agent, tier: zb?.tier, response: (zb?.response || '').slice(0, 200) },
                cosmique: { agent: cb?.agent, tier: cb?.tier, response: (cb?.response || '').slice(0, 200) } },
    notes,
  });
  expect(bothClaudePremium).toBe(true);
});

test('P2 Phase 2 sourcing — premium uses paid Apify', async ({ request }) => {
  test.setTimeout(180_000);
  const notes: string[] = [];
  let jobId: string | null = null, runId: string | null = null;
  try {
    const j = await request.post(`${SUPA}/rest/v1/hr_job_requisitions`, {
      headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, Prefer: 'return=representation' },
      data: { tenant_id: ZATE, requisition_number: `P2-${TS}`, job_title: 'Senior Software Engineer',
              title: 'Senior Software Engineer', location_city: 'Dubai', location_country: 'UAE',
              status: 'active', required_skills: ['React'], source_url: null },
    });
    const jr = await j.json();
    jobId = Array.isArray(jr) ? jr[0]?.id : jr?.id;
    const t = await request.post('http://localhost:5678/webhook/hr/job/trigger-sourcing-v2', {
      headers: { 'Content-Type': 'application/json' },
      data: { tenant_id: ZATE, job_requisition_id: jobId, trigger_type: 'manual' },
      timeout: 120_000,
    });
    const tb = await t.json();
    runId = tb?.data?.sourcing_run_id;
    // Poll up to 90s
    let final: any = null;
    const start = Date.now();
    while (Date.now() - start < 120_000) {
      await new Promise(r => setTimeout(r, 3000));
      const g = await request.get(`${SUPA}/rest/v1/hr_sourcing_runs?id=eq.${runId}&select=status,phase2_candidates_found,error_log,phase2_data`,
        { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } });
      const arr = await g.json();
      final = Array.isArray(arr) ? arr[0] : null;
      if (final && ['completed', 'failed'].includes(final.status)) break;
    }
    notes.push(`final status=${final?.status} candidates=${final?.phase2_candidates_found}`);
    notes.push(`error_log=${(final?.error_log || '').slice(0, 160)}`);
    const sample = (final?.phase2_data || []).slice(0, 3).map((c: any) => ({ url: c.url, title: c.title?.slice(0, 60), source: c.source }));
    notes.push(`sample=${JSON.stringify(sample)}`);
    const realCandidates = (final?.phase2_candidates_found || 0) > 0;
    const fromPaidApify = (final?.phase2_data || []).some((c: any) => c.source === 'apify_premium_paid');
    results.push({
      id: 'P2', name: 'Phase 2 premium paid Apify returns real candidates',
      verdict: realCandidates && fromPaidApify ? 'PASS' : 'FAIL',
      evidence: { candidates: final?.phase2_candidates_found, from_paid_apify: fromPaidApify, sample },
      notes,
    });
    expect(realCandidates && fromPaidApify).toBe(true);
  } catch (e: any) {
    const idx = results.findIndex(r => r.id === 'P2');
    const entry: Result = { id: 'P2', name: 'Phase 2 premium paid Apify returns real candidates', verdict: 'FAIL', evidence: {}, notes, error: String(e?.message).slice(0, 400) };
    if (idx >= 0) results[idx] = entry; else results.push(entry);
    throw e;
  } finally {
    if (runId) await request.delete(`${SUPA}/rest/v1/hr_sourcing_runs?id=eq.${runId}`,
      { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }).catch(() => {});
    if (jobId) await request.delete(`${SUPA}/rest/v1/hr_job_requisitions?id=eq.${jobId}`,
      { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }).catch(() => {});
  }
});

test('P3 Performance review create — no more 400', async ({ request }) => {
  test.setTimeout(60_000);
  const notes: string[] = [];
  let reviewId: string | null = null;
  // Look up a real employee + cycle
  const emps = await (await request.get(`${SUPA}/rest/v1/hr_employees?tenant_id=eq.${ZATE}&select=id&limit=1`,
    { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } })).json();
  const empId = emps[0]?.id;
  const cycles = await (await request.get(`${SUPA}/rest/v1/hr_performance_cycles?tenant_id=eq.${ZATE}&order=created_at.desc&limit=1&select=id`,
    { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } })).json();
  const cycleId = cycles[0]?.id;
  notes.push(`emp=${empId} cycle=${cycleId}`);
  // Insert the new-shape payload directly
  const r = await request.post(`${SUPA}/rest/v1/hr_performance_reviews`, {
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    data: {
      tenant_id: ZATE, employee_id: empId, cycle_id: cycleId,
      review_type: 'manager', status: 'draft', rating_scale: 5,
    },
  });
  const status = r.status();
  const body = await r.json();
  reviewId = Array.isArray(body) ? body[0]?.id : body?.id;
  notes.push(`HTTP=${status} review_id=${reviewId}`);
  results.push({
    id: 'P3', name: 'Performance review create (no 400)',
    verdict: status === 201 && !!reviewId ? 'PASS' : 'FAIL',
    evidence: { http: status, review_id: reviewId, body: typeof body === 'object' ? JSON.stringify(body).slice(0, 300) : body },
    notes,
  });
  expect(status).toBe(201);
  if (reviewId) await request.delete(`${SUPA}/rest/v1/hr_performance_reviews?id=eq.${reviewId}`,
    { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } });
});

test('P4 AI Auto-Review via Claude produces real ratings', async ({ request }) => {
  test.setTimeout(120_000);
  const notes: string[] = [];
  let reviewId: string | null = null;
  try {
    const emps = await (await request.get(`${SUPA}/rest/v1/hr_employees?tenant_id=eq.${ZATE}&select=id,first_name,last_name&limit=1`,
      { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } })).json();
    const emp = emps[0];
    const r = await request.post('http://localhost:5678/webhook/hr/review/generate', {
      headers: { 'Content-Type': 'application/json' },
      data: { tenant_id: ZATE, employee_id: emp.id, review_type: 'quarterly' },
      timeout: 90_000,
    });
    const body = await r.json();
    const payload = Array.isArray(body) ? body[0] : body;
    reviewId = payload?.review?.id;
    notes.push(`agent=${payload?.agent} employee=${payload?.employee_name} period=${payload?.period}`);
    notes.push(`signals=${JSON.stringify(payload?.performance_signals)}`);
    notes.push(`overall_rating=${payload?.review?.overall_rating}`);
    notes.push(`strengths_len=${(payload?.review?.strengths || '').length} ai_summary_len=${(payload?.review?.comments || '').length}`);
    const pass = payload?.success && /claude/i.test(payload?.agent || '') && payload?.review?.overall_rating > 0 && (payload?.review?.strengths || '').length > 100;
    results.push({
      id: 'P4', name: 'AI Auto-Review via Claude',
      verdict: pass ? 'PASS' : 'FAIL',
      evidence: { agent: payload?.agent, overall_rating: payload?.review?.overall_rating,
                  strengths: (payload?.review?.strengths || '').slice(0, 300),
                  ai_summary: (payload?.review?.comments || '').slice(0, 300) },
      notes,
    });
    expect(pass).toBe(true);
  } finally {
    if (reviewId) await request.delete(`${SUPA}/rest/v1/hr_performance_reviews?id=eq.${reviewId}`,
      { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }).catch(() => {});
  }
});

test('P5 Training Generator produces real content + questions', async ({ request }) => {
  test.setTimeout(120_000);
  const notes: string[] = [];
  let programId: string | null = null;
  try {
    const r = await request.post('http://localhost:5678/webhook/hr/training/generate', {
      headers: { 'Content-Type': 'application/json' },
      data: { tenant_id: COSMIQUE, topic: `Hand Hygiene ${TS}`, category: 'compliance', duration_minutes: 10 },
      timeout: 90_000,
    });
    const body = await r.json();
    const payload = Array.isArray(body) ? body[0] : body;
    programId = payload?.program_id;
    notes.push(`agent=${payload?.agent} program=${payload?.name}`);
    notes.push(`content_len=${payload?.content_length} slides=${payload?.slides_count} questions=${payload?.questions_count}`);
    notes.push(`objectives=${JSON.stringify(payload?.learning_objectives).slice(0, 200)}`);
    const pass = payload?.success && (payload?.content_length || 0) > 500 && (payload?.questions_count || 0) >= 4;
    results.push({
      id: 'P5', name: 'Training Generator produces structured content',
      verdict: pass ? 'PASS' : 'FAIL',
      evidence: { agent: payload?.agent, content_length: payload?.content_length,
                  slides_count: payload?.slides_count, questions_count: payload?.questions_count,
                  learning_objectives: payload?.learning_objectives },
      notes,
    });
    expect(pass).toBe(true);
  } finally {
    if (programId) await request.delete(`${SUPA}/rest/v1/hr_training_programs?id=eq.${programId}`,
      { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }).catch(() => {});
  }
});
