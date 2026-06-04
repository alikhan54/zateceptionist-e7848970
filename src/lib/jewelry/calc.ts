/**
 * Legacy Jewellers — jewelry calculation engine (Project JX, Phase 2).
 *
 * PURE functions only: no DB, no network, no I/O, no globals. Deterministic in →
 * deterministic out, so it is trivially unit-testable and reusable from the
 * frontend, n8n Code nodes, or a service. NOTHING here prices money against the
 * DB; callers pass every rate/rule explicitly.
 *
 * Design notes:
 *  - Internal math keeps full float precision; rounding happens only at BOUNDARIES
 *    (function returns): money → 2 dp, weights → 3 dp. See `round`.
 *  - Tax is ALWAYS derived from the passed `TaxRule`. No tax rate is hard-coded.
 *  - Signatures are intentionally flexible (optional tuning fields) so per-shop
 *    variations — making on net vs gross, etc. — need configuration, not a rewrite.
 *    Defaults implement the canonical Legacy Jewellers spec.
 *
 * Spec authority: DISCOVERY_FINDINGS.md + the Phase 2 task spec. No external file 00 present.
 */

// ──────────────────────────────────────────────────────────────────────────
// Rounding helpers (exposed for callers/tests)
// ──────────────────────────────────────────────────────────────────────────

/** Round `n` to `dp` decimal places, nudging by EPSILON to tame float drift (e.g. 1.005). */
export function round(n: number, dp: number): number {
  if (!Number.isFinite(n)) return n;
  const f = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * f) / f;
}
/** Money boundary: 2 dp. */
export const round2 = (n: number): number => round(n, 2);
/** Weight boundary: 3 dp. */
export const round3 = (n: number): number => round(n, 3);

// ──────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────

/**
 * Purity factor by karat = karat / 24 (exact fractions).
 * 24 → 1, 22 → 22/24 (≈ 0.916667), 21 → 0.875, 18 → 0.75.
 * Stored as exact fractions so downstream money math matches hand calcs to the cent.
 */
export const KARAT_FACTOR: Record<number, number> = {
  24: 1,
  22: 22 / 24, // ≈ 0.916667
  21: 21 / 24, // = 0.875
  18: 18 / 24, // = 0.75
};

/** Default tola → grams. Configurable per shop via the `tola` params below. */
export const TOLA_GRAMS = 11.6638;

/** Purity factor for any karat; falls back to the generic karat/24 for uncommon karats. */
export function karatFactor(karat: number): number {
  return KARAT_FACTOR[karat] ?? karat / 24;
}

// ──────────────────────────────────────────────────────────────────────────
// Weight conversions
// ──────────────────────────────────────────────────────────────────────────

/** Pure (fine) gold weight in grams = net grams × purity factor. Full precision (no rounding). */
export function pureWeight(netGrams: number, karat: number): number {
  return netGrams * karatFactor(karat);
}

/** Grams → tola. */
export function gramsToTola(g: number, tola: number = TOLA_GRAMS): number {
  return g / tola;
}
/** Tola → grams. */
export function tolaToGrams(t: number, tola: number = TOLA_GRAMS): number {
  return t * tola;
}

// ──────────────────────────────────────────────────────────────────────────
// Sale line
// ──────────────────────────────────────────────────────────────────────────

export type ChargeBasis = 'per_gram' | 'fixed';
export interface Charge {
  type: ChargeBasis;
  value: number;
}

/** A stone is priced either by an absolute price, or by qty × rate. */
export type Stone = { price: number } | { qty: number; rate: number };

/** Which weight a per-gram making/polish charge multiplies (default: net). */
export type WeightBasis = 'net' | 'gross';

export interface SaleLineInput {
  netGrams: number;
  karat: number;
  ratePerGram: number;
  making: Charge;
  /** Wastage percent applied to net weight. Default 0. */
  wastePct?: number;
  polish?: Charge;
  stones?: Stone[];
  otherCharges?: number;
  /** per-gram making multiplies this weight. Default 'net' (spec). */
  makingBasis?: WeightBasis;
  /** per-gram polish multiplies this weight. Default 'net' (spec). */
  polishBasis?: WeightBasis;
}

export interface SaleLineResult {
  wastageGrams: number;
  metalValue: number;
  making: number;
  polish: number;
  stoneValue: number;
  lineSubtotal: number;
  /** Additive: pure gold content (g) of this line — feeds the gold ledger + fixed_per_gram tax. */
  fineGrams: number;
}

function stoneValueOf(s: Stone): number {
  if ('price' in s && s.price != null) return s.price;
  if ('qty' in s && 'rate' in s) return s.qty * s.rate;
  return 0;
}

function chargeAmount(c: Charge | undefined, netGrams: number, grossGrams: number, basis: WeightBasis): number {
  if (!c) return 0;
  if (c.type === 'per_gram') return c.value * (basis === 'gross' ? grossGrams : netGrams);
  return c.value; // 'fixed'
}

/**
 * One sale line.
 *   wastageGrams = netGrams × wastePct/100
 *   metalValue   = (netGrams + wastageGrams) × ratePerGram
 *   making       = per_gram ? value×weight(basis) : value
 *   polish       = same rule as making (0 if absent)
 *   stoneValue   = Σ (price ?? qty×rate)
 *   lineSubtotal = metalValue + making + polish + stoneValue + otherCharges
 */
export function saleLineTotal(input: SaleLineInput): SaleLineResult {
  const {
    netGrams, karat, ratePerGram, making,
    wastePct = 0, polish, stones = [], otherCharges = 0,
    makingBasis = 'net', polishBasis = 'net',
  } = input;

  const wastageGrams = netGrams * (wastePct / 100);
  const grossGrams = netGrams + wastageGrams;

  const metalValue = grossGrams * ratePerGram;
  const makingAmt = chargeAmount(making, netGrams, grossGrams, makingBasis);
  const polishAmt = chargeAmount(polish, netGrams, grossGrams, polishBasis);
  const stoneValue = stones.reduce((sum, s) => sum + stoneValueOf(s), 0);
  const lineSubtotal = metalValue + makingAmt + polishAmt + stoneValue + otherCharges;

  return {
    wastageGrams: round3(wastageGrams),
    metalValue: round2(metalValue),
    making: round2(makingAmt),
    polish: round2(polishAmt),
    stoneValue: round2(stoneValue),
    lineSubtotal: round2(lineSubtotal),
    fineGrams: round3(pureWeight(netGrams, karat)),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Tax
// ──────────────────────────────────────────────────────────────────────────

export type TaxBasis = 'value' | 'making' | 'fixed_per_gram';
export interface TaxRule {
  basis: TaxBasis;
  rate: number;
}

/**
 * Tax ALWAYS derives from the passed rule — never a hard-coded rate.
 *   value          → rate × subtotal
 *   making         → rate × makingTotal
 *   fixed_per_gram → rate × fineGrams
 */
export function applyTax(subtotal: number, makingTotal: number, fineGrams: number, taxRule: TaxRule): number {
  let tax = 0;
  switch (taxRule.basis) {
    case 'value': tax = taxRule.rate * subtotal; break;
    case 'making': tax = taxRule.rate * makingTotal; break;
    case 'fixed_per_gram': tax = taxRule.rate * fineGrams; break;
  }
  return round2(tax);
}

// ──────────────────────────────────────────────────────────────────────────
// Old-gold trade-in credit
// ──────────────────────────────────────────────────────────────────────────

export interface OldGoldInput {
  netGrams: number;
  karat: number;
  rateBuy: number;
  /** Legacy's 22K zero-deduction USP: full purity value, no deduction. */
  zeroDeduction: boolean;
  /** Deduction percent when zeroDeduction is false. Default 0. */
  deductionPct?: number;
}

/**
 * Credit for customer's old gold.
 *   zeroDeduction → pureWeight × rateBuy           (full purity value)
 *   else          → pureWeight × rateBuy × (1 − deductionPct/100)
 * Rounds only the final credit (keeps purity precision through the multiply).
 */
export function oldGoldCredit(input: OldGoldInput): number {
  const { netGrams, karat, rateBuy, zeroDeduction, deductionPct = 0 } = input;
  const pure = pureWeight(netGrams, karat);
  const gross = pure * rateBuy;
  const credit = zeroDeduction ? gross : gross * (1 - deductionPct / 100);
  return round2(credit);
}

// ──────────────────────────────────────────────────────────────────────────
// Sale total
// ──────────────────────────────────────────────────────────────────────────

export interface Tender {
  cash?: number;
  card?: number;
  cheque?: number;
  usedGoldValue?: number;
}

export interface SaleTotalInput {
  /** Pre-computed sale lines (outputs of `saleLineTotal`). */
  lines: SaleLineResult[];
  taxRule: TaxRule;
  discount?: number;
  oldGold?: OldGoldInput;
  tender: Tender;
}

export interface SaleTotalResult {
  subtotal: number;
  tax: number;
  oldGoldCredit: number;
  netBill: number;
  totalReceived: number;
  cashBalance: number;
}

/**
 *   subtotal      = Σ line.lineSubtotal
 *   tax           = applyTax(subtotal, Σ line.making, Σ line.fineGrams, taxRule)
 *   oldGoldCredit = oldGold ? oldGoldCredit(oldGold) : 0
 *   netBill       = subtotal + tax − discount − oldGoldCredit
 *   totalReceived = cash + card + cheque + usedGoldValue
 *   cashBalance   = totalReceived − netBill   (positive = change due; negative = still owed)
 */
export function saleTotal(input: SaleTotalInput): SaleTotalResult {
  const { lines, taxRule, discount = 0, oldGold, tender } = input;

  const subtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0);
  const makingTotal = lines.reduce((s, l) => s + l.making, 0);
  const fineGrams = lines.reduce((s, l) => s + l.fineGrams, 0);

  const tax = applyTax(subtotal, makingTotal, fineGrams, taxRule);
  const credit = oldGold ? oldGoldCredit(oldGold) : 0;

  const netBill = subtotal + tax - discount - credit;

  const { cash = 0, card = 0, cheque = 0, usedGoldValue = 0 } = tender;
  const totalReceived = cash + card + cheque + usedGoldValue;
  const cashBalance = totalReceived - netBill;

  return {
    subtotal: round2(subtotal),
    tax: round2(tax),
    oldGoldCredit: round2(credit),
    netBill: round2(netBill),
    totalReceived: round2(totalReceived),
    cashBalance: round2(cashBalance),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Gold ledger
// ──────────────────────────────────────────────────────────────────────────

export type LedgerDirection = 'in' | 'out';

/** Signed fine-gram movement for the gold ledger. 'out' is negative. Weight rounded to 3 dp. */
export function goldLedgerFineGrams(netGrams: number, karat: number, direction: LedgerDirection): number {
  const fine = pureWeight(netGrams, karat);
  return round3(direction === 'out' ? -fine : fine);
}
