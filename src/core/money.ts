/** Belopp i ören. Alla pengar i appen representeras som heltal. */
export type Ore = number;

/**
 * Tolkar ett belopp skrivet av en användare ("120", "120,50", "1 200.5")
 * till ören. Returnerar null om strängen inte är ett giltigt, icke-negativt belopp.
 */
export function parseAmount(input: string): Ore | null {
  const cleaned = input.replace(/[\s ]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const [kronor = '0', ore = ''] = cleaned.split('.');
  return Number(kronor) * 100 + Number(ore.padEnd(2, '0'));
}

/** Formaterar ören som svenska kronor, t.ex. 123450 → "1 234,50 kr". */
export function formatAmount(amount: Ore): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const kronor = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ore = (abs % 100).toString().padStart(2, '0');
  return `${sign}${kronor},${ore} kr`;
}

/**
 * Delar ett belopp i `parts` lika delar utan att tappa ören.
 * Resten fördelas deterministiskt, en öre i taget, till de första delarna.
 * splitEvenly(100, 3) → [34, 33, 33]
 */
export function splitEvenly(amount: Ore, parts: number): Ore[] {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError('amount måste vara ett icke-negativt heltal i ören');
  }
  if (!Number.isInteger(parts) || parts < 1) {
    throw new RangeError('parts måste vara ett positivt heltal');
  }
  const base = Math.floor(amount / parts);
  const remainder = amount % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}
