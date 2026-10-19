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

/** Kronor och ören för ett belopp utan tecken, t.ex. 123450 → { kronor: "1234", ore: "50" }. */
function splitKronor(amount: Ore): { kronor: string; ore: string } {
  const abs = Math.abs(amount);
  return {
    kronor: Math.floor(abs / 100).toString(),
    ore: (abs % 100).toString().padStart(2, '0'),
  };
}

const withThousandSeparators = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Formaterar ören som svenska kronor, t.ex. 123450 → "1 234,50 kr". */
export function formatAmount(amount: Ore): string {
  const sign = amount < 0 ? '-' : '';
  const { kronor, ore } = splitKronor(amount);
  return `${sign}${withThousandSeparators(kronor)},${ore} kr`;
}

/**
 * Formaterar ett saldo med tydligt tecken: "+1 234,50 kr", "−800,00 kr" eller "0,00 kr".
 * Använder det typografiska minustecknet (U+2212).
 */
export function formatSignedAmount(amount: Ore): string {
  const unsigned = formatAmount(Math.abs(amount));
  if (amount > 0) return `+${unsigned}`;
  if (amount < 0) return `−${unsigned}`;
  return unsigned;
}

/**
 * Formaterar ören för ett redigerbart fält, t.ex. 123450 → "1234,50".
 * Utdata kan alltid läsas tillbaka med parseAmount.
 */
export function formatAmountForInput(amount: Ore): string {
  const { kronor, ore } = splitKronor(amount);
  return `${kronor},${ore}`;
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
