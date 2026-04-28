/**
 * Schreiber/Scheibler Kalsimetre Yöntemi ile Toprakta Kireç (CaCO3) Tayini
 */

export interface CalcimeterInput {
  ornekNo: string;
  agirlik: number;       // gram, >0
  sicaklik: number;      // °C (10-30)
  basinc: number;        // mmHg veya mbar
  basincBirimi: 'mmHg' | 'mbar';
  okuma: number;          // cm³, >=0
}

export interface CalcimeterResult {
  ornekNo: string;
  agirlik: number;
  sicaklik: number;
  basincMmHg: number;
  okuma: number;
  buharBasinci: number;   // e
  duzeltilmisHacim: number; // V0
  caco3Yuzde: number;     // %CaCO3
  sinif: string;
}

export class CalcimeterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalcimeterError';
  }
}

export interface CalcimeterWarning {
  field: string;
  message: string;
}

/**
 * Basınç birimini mbar'dan mmHg'ye çevirir.
 */
export function mbarToMmHg(mbar: number): number {
  return mbar * 0.7502;
}

/**
 * Buhar basıncını hesaplar.
 * e = 0.0302*t² - 0.1075*t + 7.4354
 */
export function buharBasinci(t: number): number {
  return 0.0302 * t * t - 0.1075 * t + 7.4354;
}

/**
 * Düzeltilmiş hacmi hesaplar (V0).
 * V0 = okuma * (basinc - e) * 273 / (760 * (273 + t))
 */
export function duzeltilmisHacim(okuma: number, basinc: number, e: number, t: number): number {
  return (okuma * (basinc - e) * 273) / (760 * (273 + t));
}

/**
 * CaCO3 yüzdesini hesaplar.
 * %CaCO3 = V0 * 0.4464 / agirlik
 */
export function caco3Yuzde(v0: number, agirlik: number): number {
  return (v0 * 0.4464) / agirlik;
}

/**
 * Kireç sınıfını belirler.
 */
export function kirecSinifi(yuzde: number): string {
  if (yuzde <= 1.0) return 'Az kireçli';
  if (yuzde <= 5.0) return 'Kireçli';
  if (yuzde <= 15.0) return 'Orta derecede kireçli';
  if (yuzde <= 25.0) return 'Fazla kireçli';
  return 'Çok kireçli';
}

/**
 * Giriş doğrulaması yapar. Hatalar fırlatır, uyarılar döndürür.
 */
export function validate(input: CalcimeterInput): CalcimeterWarning[] {
  const warnings: CalcimeterWarning[] = [];

  if (input.agirlik <= 0) {
    throw new CalcimeterError('Ağırlık 0 veya negatif olamaz.');
  }
  if (input.okuma < 0) {
    throw new CalcimeterError('Okuma değeri negatif olamaz.');
  }
  if (input.sicaklik < 10 || input.sicaklik > 30) {
    warnings.push({
      field: 'sicaklik',
      message: `Sıcaklık (${input.sicaklik}°C) önerilen aralığın (10-30°C) dışında.`,
    });
  }
  // Basıncı mmHg'ye çevirip kontrol et
  const bMmHg = input.basincBirimi === 'mbar' ? mbarToMmHg(input.basinc) : input.basinc;
  if (bMmHg < 600 || bMmHg > 900) {
    warnings.push({
      field: 'basinc',
      message: `Basınç (${bMmHg.toFixed(1)} mmHg) normal atmosferik aralığın dışında.`,
    });
  }

  return warnings;
}

/**
 * Ana hesaplama fonksiyonu.
 */
export function hesapla(input: CalcimeterInput): { result: CalcimeterResult; warnings: CalcimeterWarning[] } {
  const warnings = validate(input);

  const basincMmHg = input.basincBirimi === 'mbar' ? mbarToMmHg(input.basinc) : input.basinc;
  const e = buharBasinci(input.sicaklik);
  const v0 = duzeltilmisHacim(input.okuma, basincMmHg, e, input.sicaklik);
  const yuzde = caco3Yuzde(v0, input.agirlik);

  if (yuzde < 0) {
    throw new CalcimeterError('Hesaplanan CaCO3 yüzdesi negatif. Giriş değerlerini kontrol edin.');
  }

  const sinif = kirecSinifi(yuzde);

  return {
    result: {
      ornekNo: input.ornekNo,
      agirlik: input.agirlik,
      sicaklik: input.sicaklik,
      basincMmHg,
      okuma: input.okuma,
      buharBasinci: e,
      duzeltilmisHacim: v0,
      caco3Yuzde: yuzde,
      sinif,
    },
    warnings,
  };
}
