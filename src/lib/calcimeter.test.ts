import { describe, it, expect } from 'vitest';
import {
  buharBasinci,
  duzeltilmisHacim,
  caco3Yuzde,
  kirecSinifi,
  hesapla,
  mbarToMmHg,
  CalcimeterError,
} from './calcimeter';

describe('buharBasinci', () => {
  it('24°C için doğru hesaplamalı', () => {
    // e = 0.0302*24^2 - 0.1075*24 + 7.4354
    // e = 0.0302*576 - 2.58 + 7.4354 = 17.3952 - 2.58 + 7.4354 = 22.2506
    const e = buharBasinci(24);
    expect(e).toBeCloseTo(22.2506, 3);
  });
});

describe('duzeltilmisHacim', () => {
  it('verilen değerler için doğru V0 hesaplamalı', () => {
    const e = 22.2506;
    // V0 = 15 * (759 - 22.2506) * 273 / (760 * (273 + 24))
    // V0 = 15 * 736.7494 * 273 / (760 * 297)
    // V0 = 3015548.7930 / 225720 = 13.3590...
    const v0 = duzeltilmisHacim(15, 759, e, 24);
    expect(v0).toBeCloseTo(13.36, 1);
  });
});

describe('caco3Yuzde', () => {
  it('V0 ve ağırlıktan doğru yüzde hesaplamalı', () => {
    const v0 = 13.3661;
    const yuzde = caco3Yuzde(v0, 0.5);
    expect(yuzde).toBeCloseTo(11.93, 1);
  });
});

describe('kirecSinifi', () => {
  it('sınıfları doğru belirlemeli', () => {
    expect(kirecSinifi(0.5)).toBe('Az kireçli');
    expect(kirecSinifi(1.0)).toBe('Az kireçli');
    expect(kirecSinifi(1.1)).toBe('Kireçli');
    expect(kirecSinifi(5.0)).toBe('Kireçli');
    expect(kirecSinifi(5.1)).toBe('Orta derecede kireçli');
    expect(kirecSinifi(15.0)).toBe('Orta derecede kireçli');
    expect(kirecSinifi(15.1)).toBe('Fazla kireçli');
    expect(kirecSinifi(25.0)).toBe('Fazla kireçli');
    expect(kirecSinifi(25.1)).toBe('Çok kireçli');
  });
});

describe('mbarToMmHg', () => {
  it('mbar -> mmHg dönüşümü doğru olmalı', () => {
    expect(mbarToMmHg(1013.25)).toBeCloseTo(760.14, 1);
  });
});

describe('hesapla - entegrasyon', () => {
  it('test vakası: 0.5g, 24°C, 759mmHg, 15cm³', () => {
    const { result, warnings } = hesapla({
      ornekNo: 'T-001',
      agirlik: 0.5,
      sicaklik: 24,
      basinc: 759,
      basincBirimi: 'mmHg',
      okuma: 15,
    });

    expect(result.buharBasinci).toBeCloseTo(22.2506, 3);
    expect(result.duzeltilmisHacim).toBeCloseTo(13.37, 1);
    expect(result.caco3Yuzde).toBeCloseTo(11.93, 0);
    expect(result.sinif).toBe('Orta derecede kireçli');
    expect(warnings).toHaveLength(0);
  });

  it('ağırlık 0 olursa hata fırlatmalı', () => {
    expect(() =>
      hesapla({
        ornekNo: 'T-ERR',
        agirlik: 0,
        sicaklik: 20,
        basinc: 760,
        basincBirimi: 'mmHg',
        okuma: 10,
      })
    ).toThrow(CalcimeterError);
  });

  it('negatif okuma hata fırlatmalı', () => {
    expect(() =>
      hesapla({
        ornekNo: 'T-ERR',
        agirlik: 1,
        sicaklik: 20,
        basinc: 760,
        basincBirimi: 'mmHg',
        okuma: -5,
      })
    ).toThrow(CalcimeterError);
  });

  it('sıcaklık sınır dışında uyarı vermeli', () => {
    const { warnings } = hesapla({
      ornekNo: 'T-WARN',
      agirlik: 1,
      sicaklik: 35,
      basinc: 760,
      basincBirimi: 'mmHg',
      okuma: 10,
    });

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].field).toBe('sicaklik');
  });

  it('mbar birimini doğru çevirmeli', () => {
    const { result } = hesapla({
      ornekNo: 'T-MBAR',
      agirlik: 0.5,
      sicaklik: 24,
      basinc: 1011.69,
      basincBirimi: 'mbar',
      okuma: 15,
    });

    // 1011.69 * 0.7502 ≈ 758.97 mmHg ≈ 759
    expect(result.basincMmHg).toBeCloseTo(759, 0);
  });
});
