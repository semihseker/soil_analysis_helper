/**
 * Soil Total Soluble Salt & ECe Determination
 * Tuz / ECe Tayin Motoru
 */

export interface TuzInput {
  ornekNo?: string;
  temperature: number; // °C
  saturation: number; // cm3
  resistance: number; // Ohm
}

export interface TuzResult {
  ornekNo: string;
  temperature: number;
  saturation: number;
  resistance: number;
  tempCorrFactor: number;
  saltPct: number;
  ece: number;
  saltClassPct: string;
  saltClassEce: string;
  suitableCrops: string;
}

export class TuzError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TuzError';
  }
}

const ECE_CLASS_LIMITS = [
  { upper: 4, label: 'Tuzsuz' },
  { upper: 8, label: 'Az tuzlu' },
  { upper: 15, label: 'Orta tuzlu' },
  { upper: Infinity, label: 'Tuzlu' },
];

const SALT_PCT_LIMITS = [
  { upper: 0.15, label: 'Tuzsuz' },
  { upper: 0.35, label: 'Az tuzlu' },
  { upper: 0.65, label: 'Orta tuzlu' },
  { upper: Infinity, label: 'Tuzlu' },
];

const CROPS: Record<string, string> = {
  'Tuzsuz': 'Tüm bitkiler (All crops)',
  'Az tuzlu': 'Kabak, pancar, lahana, kereviz, hıyar (Squash, beet, cabbage, celery, cucumber)',
  'Orta tuzlu': 'Pamuk, arpa (Cotton, barley)',
  'Tuzlu': 'Kuşkonmaz, jojoba (Asparagus, jojoba)',
};

export function tempCorrFactor(B: number): number {
  return 0.00019811 * B * B + 0.01821828 * B + 0.6648744;
}

export function calcSaltPct(B: number, C: number, D: number): number {
  if (D <= 0 || C <= 0) throw new TuzError('Direnç (Ohm) ve Saturasyon (cm3) sıfırdan büyük olmalıdır.');
  if (B < 0 || B > 60) throw new TuzError('Sıcaklık değeri olağandışı (0-60°C arası olmalıdır).');
  const f = tempCorrFactor(B);
  return (0.7628 * C + 50.926) * Math.pow(f * D, -1.225);
}

export function calcEce(C: number, D: number): number {
  if (D <= 0 || C <= 0) throw new TuzError('Direnç (Ohm) ve Saturasyon (cm3) sıfırdan büyük olmalıdır.');
  return (-0.0073 * Math.pow(C, 3) + 1.6327 * Math.pow(C, 2) - 124.83 * C + 4422.4) * Math.pow(D, -1.13);
}

export function hesaplaTuz(input: TuzInput): TuzResult {
  const { temperature, saturation, resistance, ornekNo } = input;

  if (isNaN(temperature) || isNaN(saturation) || isNaN(resistance)) {
    throw new TuzError('Geçersiz sayısal giriş.');
  }

  let saltPct = calcSaltPct(temperature, saturation, resistance);
  let ece = calcEce(saturation, resistance);

  if (saltPct < 0) saltPct = 0;
  if (ece < 0) ece = 0;

  const saltClassPct = SALT_PCT_LIMITS.find((r) => saltPct < r.upper)?.label || 'Bilinmiyor';
  const saltClassEce = ECE_CLASS_LIMITS.find((r) => ece < r.upper)?.label || 'Bilinmiyor';

  return {
    ornekNo: ornekNo || 'Örnek',
    temperature,
    saturation,
    resistance,
    tempCorrFactor: tempCorrFactor(temperature),
    saltPct,
    ece,
    saltClassPct,
    saltClassEce,
    suitableCrops: CROPS[saltClassEce] || '-',
  };
}
