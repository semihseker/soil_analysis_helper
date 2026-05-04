import { describe, it, expect } from 'vitest';
import { toCartesian, classifySoilTexture, hesaplaTexture, hesaplaHydrometer, TextureError } from './soil-texture';

describe('toCartesian', () => {
  it('köşe noktalarını doğru dönüştürmeli', () => {
    // Sol üst köşe: 100% Clay
    const [x1, y1] = toCartesian(0, 100, 0);
    expect(x1).toBeCloseTo(50, 0);
    expect(y1).toBeCloseTo(86.6, 0);

    // Sağ alt köşe: 100% Sand
    const [x2, y2] = toCartesian(100, 0, 0);
    expect(x2).toBeCloseTo(0, 0);
    expect(y2).toBeCloseTo(0, 0);

    // Sol alt köşe: 100% Silt
    const [x3, y3] = toCartesian(0, 0, 100);
    expect(x3).toBeCloseTo(100, 0);
    expect(y3).toBeCloseTo(0, 0);
  });
});

describe('classifySoilTexture', () => {
  it('saf kum doğru sınıflandırılmalı', () => {
    const result = classifySoilTexture(95, 3, 2);
    expect(result.name).toBe('Sand');
    expect(result.nameTR).toBe('Kum');
  });

  it('saf kil doğru sınıflandırılmalı', () => {
    const result = classifySoilTexture(10, 60, 30);
    expect(result.name).toBe('Clay');
    expect(result.nameTR).toBe('Kil');
  });

  it('tın doğru sınıflandırılmalı', () => {
    const result = classifySoilTexture(40, 20, 40);
    expect(result.name).toBe('Loam');
    expect(result.nameTR).toBe('Tın');
  });

  it('siltli tın doğru sınıflandırılmalı', () => {
    const result = classifySoilTexture(15, 15, 70);
    expect(result.name).toBe('Silt Loam');
    expect(result.nameTR).toBe('Siltli Tın');
  });

  it('kumlu killi tın doğru sınıflandırılmalı', () => {
    const result = classifySoilTexture(60, 25, 15);
    expect(result.name).toBe('Sandy Clay Loam');
    expect(result.nameTR).toBe('Kumlu Killi Tın');
  });

  it('tınlı kum doğru sınıflandırılmalı', () => {
    const result = classifySoilTexture(80, 8, 12);
    expect(result.name).toBe('Loamy Sand');
    expect(result.nameTR).toBe('Tınlı Kum');
  });
});

describe('hesaplaTexture', () => {
  it('geçerli girdiyi doğru hesaplamalı', () => {
    const result = hesaplaTexture({ sand: 40, silt: 40, clay: 20, ornekNo: 'T-001' });
    expect(result.ornekNo).toBe('T-001');
    expect(result.textureClass).toBe('Loam');
    expect(result.textureClassTR).toBe('Tın');
    expect(result.sand).toBeCloseTo(40, 0);
    expect(result.silt).toBeCloseTo(40, 0);
    expect(result.clay).toBeCloseTo(20, 0);
  });

  it('toplam 100 değilse hata fırlatmalı', () => {
    expect(() => hesaplaTexture({ sand: 30, silt: 30, clay: 30 }))
      .toThrow(TextureError);
  });

  it('negatif değerde hata fırlatmalı', () => {
    expect(() => hesaplaTexture({ sand: -10, silt: 60, clay: 50 }))
      .toThrow(TextureError);
  });

  it('%1 tolerans ile çalışmalı (yuvarlama hatası)', () => {
    const result = hesaplaTexture({ sand: 40, silt: 40, clay: 20.5 });
    expect(result.textureClass).toBeDefined();
  });

  // Hindistan test verisi (mishagrol/SoilTriangle CSV'sinden)
  it('Hindistan CSV verisi: Kaithal örneği doğru sınıflandırılmalı', () => {
    const result = hesaplaTexture({ sand: 37, silt: 35, clay: 28, ornekNo: 'Kaithal' });
    expect(result.textureClass).toBe('Clay Loam');
  });

  it('Hindistan CSV verisi: Bhiwani örneği doğru sınıflandırılmalı', () => {
    const result = hesaplaTexture({ sand: 49, silt: 27, clay: 24, ornekNo: 'Bhiwani' });
    expect(result.textureClass).toBe('Sandy Clay Loam');
  });
});

describe('hesaplaHydrometer', () => {
  it('Excel referans değerleriyle doğru hesaplamalı', () => {
    // Python referans: okuma_40sn=38.5, okuma_2saat=4.75, sicaklik_40sn=24.25, sicaklik_2saat=21.5
    // Beklenen: % kum≈19.94, % kil≈10.58, % silt≈69.48
    const r = hesaplaHydrometer({
      okuma40sn: 38.5,
      okuma2saat: 4.75,
      sicaklik40sn: 24.25,
      sicaklik2saat: 21.5,
      ornekNo: 'Excel-Test',
    });

    expect(r.ornekNo).toBe('Excel-Test');
    expect(r.sand).toBeCloseTo(19.94, 1);
    expect(r.clay).toBeCloseTo(10.58, 1);
    expect(r.silt).toBeCloseTo(69.48, 1);
    expect(r.textureClass).toBe('Silt Loam');
    expect(r.textureClassTR).toBe('Siltli Tın');
  });

  it('20°C referans sıcaklıkta düzeltme sıfıra yakın olmalı', () => {
    const r = hesaplaHydrometer({
      okuma40sn: 30,
      okuma2saat: 10,
      sicaklik40sn: 20,  // 68°F = referans
      sicaklik2saat: 20,
    });
    // Düzeltme = (68 - 68) * 0.2 = 0
    expect(r.duzeltilmis40sn).toBeCloseTo(30, 2);
    expect(r.duzeltilmis2saat).toBeCloseTo(10, 2);
  });

  it('geçersiz giriş hata fırlatmalı', () => {
    expect(() => hesaplaHydrometer({
      okuma40sn: NaN,
      okuma2saat: 10,
      sicaklik40sn: 20,
      sicaklik2saat: 20,
    })).toThrow(TextureError);
  });
});
