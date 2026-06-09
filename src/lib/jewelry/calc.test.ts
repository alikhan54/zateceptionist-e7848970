/**
 * Unit tests for the jewelry calc engine. Run with Node's native runner (no deps):
 *   node --test src/lib/jewelry/          (from repo root)
 *   node src/lib/jewelry/calc.test.ts     (single file)
 * Node ≥ 23.6 strips TS types natively; node:test + node:assert are built in.
 *
 * Every expected value is hand-computed in the comment directly above its assertion.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pureWeight, karatFactor, KARAT_FACTOR,
  gramsToTola, tolaToGrams, TOLA_GRAMS,
  saleLineTotal, applyTax, oldGoldCredit, saleTotal, goldLedgerFineGrams,
  round, round2, round3,
  type SaleLineResult,
} from './calc.ts';

// ── Case A — pinned numbers ────────────────────────────────────────────────
// 22K, net 10g, waste 8%, rate 22000/g, making per_gram 800, one stone price 15000.
//   wastageGrams = 10 × 8/100              = 0.8
//   metalValue   = (10 + 0.8) × 22000      = 237600
//   making       = 800 × 10                = 8000
//   polish                                 = 0
//   stoneValue                             = 15000
//   lineSubtotal = 237600+8000+0+15000     = 260600
//   pureWeight(10,22) = 10 × 22/24         = 9.16666… ≈ 9.1667
const LINE_A: SaleLineResult = saleLineTotal({
  netGrams: 10, karat: 22, wastePct: 8, ratePerGram: 22000,
  making: { type: 'per_gram', value: 800 },
  stones: [{ price: 15000 }],
});
test('A: pinned sale line', () => {
  assert.equal(LINE_A.wastageGrams, 0.8);
  assert.equal(LINE_A.metalValue, 237600);
  assert.equal(LINE_A.making, 8000);
  assert.equal(LINE_A.polish, 0);
  assert.equal(LINE_A.stoneValue, 15000);
  assert.equal(LINE_A.lineSubtotal, 260600);
});
test('A: pureWeight(10,22) ≈ 9.1667', () => {
  assert.equal(round(pureWeight(10, 22), 4), 9.1667);
});

// ── Case B — fixed making, no waste/stones ─────────────────────────────────
// 18K, net 5g, fixed making 5000, rate 18000/g.
//   metalValue   = (5 + 0) × 18000 = 90000
//   making (fixed)                 = 5000
//   lineSubtotal = 90000 + 5000    = 95000
test('B: fixed making line', () => {
  const b = saleLineTotal({ netGrams: 5, karat: 18, ratePerGram: 18000, making: { type: 'fixed', value: 5000 } });
  assert.equal(b.metalValue, 90000);
  assert.equal(b.making, 5000);
  assert.equal(b.wastageGrams, 0);
  assert.equal(b.stoneValue, 0);
  assert.equal(b.lineSubtotal, 95000);
});

// ── Case C — zero-deduction old gold, then a full sale total ────────────────
// oldGoldCredit(8g, 22K, rateBuy 21500, zeroDeduction):
//   pureWeight(8,22) = 8 × 22/24 = 7.33333…
//   credit = 7.33333… × 21500    = 157666.666… → 157666.67
test('C: zero-deduction old gold credit', () => {
  const credit = oldGoldCredit({ netGrams: 8, karat: 22, rateBuy: 21500, zeroDeduction: true });
  assert.equal(credit, 157666.67);
});
// saleTotal: lines=[LINE_A], tax basis 'making' rate 0.03, discount 600, oldGold above, tender cash 110000.
//   subtotal      = 260600
//   makingTotal   = 8000  → tax = 0.03 × 8000          = 240
//   oldGoldCredit                                       = 157666.67
//   netBill       = 260600 + 240 − 600 − 157666.67     = 102573.33
//   totalReceived = 110000
//   cashBalance   = 110000 − 102573.33                 = 7426.67
test('C: sale total with old-gold trade-in', () => {
  const t = saleTotal({
    lines: [LINE_A],
    taxRule: { basis: 'making', rate: 0.03 },
    discount: 600,
    oldGold: { netGrams: 8, karat: 22, rateBuy: 21500, zeroDeduction: true },
    tender: { cash: 110000 },
  });
  assert.equal(t.subtotal, 260600);
  assert.equal(t.tax, 240);
  assert.equal(t.oldGoldCredit, 157666.67);
  assert.equal(t.netBill, 102573.33);
  assert.equal(t.totalReceived, 110000);
  assert.equal(t.cashBalance, 7426.67);
});

// ── Case D — tola round-trip ───────────────────────────────────────────────
// tolaToGrams(1) = 1 × 11.6638 = 11.6638 ;  gramsToTola(11.6638) = 11.6638/11.6638 = 1
test('D: tola ↔ grams round-trip', () => {
  assert.equal(TOLA_GRAMS, 11.6638);
  assert.equal(tolaToGrams(1), 11.6638);
  assert.equal(gramsToTola(11.6638), 1);
  // configurable tola per shop
  assert.equal(tolaToGrams(2, 10), 20);
  assert.equal(gramsToTola(20, 10), 2);
});

// ── Case E — tax on making basis ───────────────────────────────────────────
// applyTax(subtotal, makingTotal=8000, fineGrams, {basis:'making', rate:0.03}) = 0.03 × 8000 = 240
test('E: tax on making basis', () => {
  assert.equal(applyTax(260600, 8000, 9.167, { basis: 'making', rate: 0.03 }), 240);
});

// ── Extra coverage ─────────────────────────────────────────────────────────
test('karat factors: table is exact karat/24', () => {
  assert.equal(KARAT_FACTOR[24], 1);
  assert.equal(KARAT_FACTOR[21], 0.875);
  assert.equal(KARAT_FACTOR[18], 0.75);
  assert.equal(round(KARAT_FACTOR[22], 6), 0.916667); // 22/24 ≈ 0.916667
  assert.equal(karatFactor(14), 14 / 24);             // generic fallback
  assert.equal(pureWeight(10, 24), 10);
  assert.equal(pureWeight(10, 18), 7.5);
  assert.equal(pureWeight(24, 14), 14);               // 24 × 14/24
});

test('stones priced by qty × rate', () => {
  // 24K net 1g rate 0 (isolate stones), making 0, stones 2×5000 + one price 3000 = 13000
  const line = saleLineTotal({
    netGrams: 1, karat: 24, ratePerGram: 0, making: { type: 'fixed', value: 0 },
    stones: [{ qty: 2, rate: 5000 }, { price: 3000 }],
  });
  assert.equal(line.stoneValue, 13000);
  assert.equal(line.lineSubtotal, 13000);
});

test('polish per_gram + otherCharges flow into subtotal', () => {
  // net 10, rate 1000 → metal 10000; making fixed 0; polish per_gram 50 → 500; other 250
  const line = saleLineTotal({
    netGrams: 10, karat: 24, ratePerGram: 1000, making: { type: 'fixed', value: 0 },
    polish: { type: 'per_gram', value: 50 }, otherCharges: 250,
  });
  assert.equal(line.metalValue, 10000);
  assert.equal(line.polish, 500);
  assert.equal(line.lineSubtotal, 10750); // 10000 + 0 + 500 + 0 + 250
});

test('tax: value and fixed_per_gram bases', () => {
  // value: 0.005 × 260600 = 1303
  assert.equal(applyTax(260600, 8000, 9.167, { basis: 'value', rate: 0.005 }), 1303);
  // fixed_per_gram: 50 × 9.167 = 458.35
  assert.equal(applyTax(260600, 8000, 9.167, { basis: 'fixed_per_gram', rate: 50 }), 458.35);
});

test('old gold with deduction percent', () => {
  // pure(10,22)=9.16666…; ×20000=183333.33…; ×(1−5/100)=×0.95 → 174166.666… → 174166.67
  const credit = oldGoldCredit({ netGrams: 10, karat: 22, rateBuy: 20000, zeroDeduction: false, deductionPct: 5 });
  assert.equal(credit, 174166.67);
});

test('gold ledger signed fine grams', () => {
  // pure(10,22)=9.16666… → in:+9.167, out:−9.167
  assert.equal(goldLedgerFineGrams(10, 22, 'in'), 9.167);
  assert.equal(goldLedgerFineGrams(10, 22, 'out'), -9.167);
});

test('saleTotal: underpayment yields negative cashBalance', () => {
  // single 24K 1g line @1000, no making/tax/discount/oldgold; pay 600 → balance −400
  const line = saleLineTotal({ netGrams: 1, karat: 24, ratePerGram: 1000, making: { type: 'fixed', value: 0 } });
  const t = saleTotal({ lines: [line], taxRule: { basis: 'value', rate: 0 }, tender: { cash: 600 } });
  assert.equal(t.netBill, 1000);
  assert.equal(t.cashBalance, -400);
});

test('rounding helper tames float drift', () => {
  assert.equal(round2(0.1 + 0.2), 0.3);   // 0.30000000000000004 → 0.3
  assert.equal(round(2.675, 2), 2.68);    // classic 2.675 → 2.68 (not 2.67)
  assert.equal(round3(9.1666666), 9.167);
  assert.equal(round2(157666.6666), 157666.67);
});
