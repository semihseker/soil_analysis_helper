/**
 * USDA Soil Texture Triangle — Hesaplama Motoru
 *
 * Kum (Sand), Silt ve Kil (Clay) yüzdelerinden USDA tekstür sınıfını belirler.
 * Sınıflandırma sınırları Brady & Weil (12th ed, fig 4.7) referansıyla,
 * mishagrol/SoilTriangle projesindeki USDA polygon verilerinden alınmıştır.
 *
 * Koordinat dönüşümü: Üçgen koordinatlarını (sand, clay, silt) kartezyen (x, y) koordinatlarına çevirir.
 */

/* ─── Types ─── */
export interface TextureInput {
  sand: number;   // %
  silt: number;   // %
  clay: number;   // %
  ornekNo?: string;
}

export interface TextureResult {
  ornekNo: string;
  sand: number;
  silt: number;
  clay: number;
  textureClass: string;
  textureClassTR: string;
  cartX: number;  // SVG çizim için
  cartY: number;
}

export class TextureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TextureError';
  }
}

/* ─── Coordinate Transform ─── */
/**
 * (sand, clay, silt) üçlüsünü kartezyen (x, y) koordinatlarına dönüştürür.
 * Bottom = Sand, Left = Clay, Right = Silt
 * x = 100 - sand - clay/2
 * y = clay * sqrt(3) / 2
 */
export function toCartesian(sand: number, clay: number, _silt: number): [number, number] {
  const x = 100 - sand - clay / 2.0;
  const y = (Math.sqrt(3) * clay) / 2.0;
  return [x, y];
}

/* ─── USDA Classification Polygons ─── */
/**
 * Her tekstür sınıfı, (sand, clay, silt) formatında köşe noktalarıyla tanımlanır.
 * Toplamları her zaman 100 olmalıdır.
 * Sınırlar USDA soil texture triangle'dan (Brady & Weil referansı) alınmıştır.
 */
interface TexturePolygon {
  name: string;
  nameTR: string;
  vertices: [number, number, number][]; // [sand, clay, silt][]
}

const USDA_POLYGONS: TexturePolygon[] = [
  {
    name: 'Clay',
    nameTR: 'Kil',
    vertices: [
      [0, 100, 0],
      [0, 60, 40],
      [20, 40, 40],
      [45, 40, 15],
      [45, 55, 0],
    ],
  },
  {
    name: 'Silty Clay',
    nameTR: 'Siltli Kil',
    vertices: [
      [0, 60, 40],
      [0, 40, 60],
      [20, 40, 40],
    ],
  },
  {
    name: 'Silty Clay Loam',
    nameTR: 'Siltli Killi Tın',
    vertices: [
      [0, 40, 60],
      [0, 27, 73],
      [20, 27, 53],
      [20, 40, 40],
    ],
  },
  {
    name: 'Clay Loam',
    nameTR: 'Killi Tın',
    vertices: [
      [20, 40, 40],
      [20, 27, 53],
      [45, 27, 28],
      [45, 40, 15],
    ],
  },
  {
    name: 'Sandy Clay',
    nameTR: 'Kumlu Kil',
    vertices: [
      [45, 55, 0],
      [45, 35, 20],
      [65, 35, 0],
    ],
  },
  {
    name: 'Sandy Clay Loam',
    nameTR: 'Kumlu Killi Tın',
    vertices: [
      [45, 35, 20],
      [45, 27, 28],
      [52, 20, 28],
      [80, 20, 0],
      [65, 35, 0],
    ],
  },
  {
    name: 'Loam',
    nameTR: 'Tın',
    vertices: [
      [23, 27, 50],
      [45, 27, 28],
      [52, 20, 28],
      [52, 7, 41],
      [43, 7, 50],
    ],
  },
  {
    name: 'Silt Loam',
    nameTR: 'Siltli Tın',
    vertices: [
      [0, 27, 73],
      [0, 12, 88],
      [20, 0, 80],
      [50, 0, 50],
      [23, 27, 50],
    ],
  },
  {
    name: 'Silt',
    nameTR: 'Silt',
    vertices: [
      [0, 12, 88],
      [0, 0, 100],
      [20, 0, 80],
    ],
  },
  {
    name: 'Sandy Loam',
    nameTR: 'Kumlu Tın',
    vertices: [
      [50, 0, 50],
      [43, 7, 50],
      [52, 7, 41],
      [52, 20, 28],
      [80, 20, 0],
      [85, 15, 0],
      [70, 0, 30],
    ],
  },
  {
    name: 'Loamy Sand',
    nameTR: 'Tınlı Kum',
    vertices: [
      [70, 0, 30],
      [85, 15, 0],
      [90, 10, 0],
      [85, 0, 15],
    ],
  },
  {
    name: 'Sand',
    nameTR: 'Kum',
    vertices: [
      [85, 0, 15],
      [90, 10, 0],
      [100, 0, 0],
    ],
  },
];

/* ─── Point-in-Polygon (Ray Casting) ─── */
function pointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/* ─── Classification ─── */
export function classifySoilTexture(sand: number, clay: number, silt: number): { name: string; nameTR: string } {
  const [px, py] = toCartesian(sand, clay, silt);

  for (const poly of USDA_POLYGONS) {
    const cartVertices: [number, number][] = poly.vertices.map(([s, c, si]) => toCartesian(s, c, si));
    if (pointInPolygon(px, py, cartVertices)) {
      return { name: poly.name, nameTR: poly.nameTR };
    }
  }

  // Sınırda kalan nokta — en yakın polygon'u bul
  return { name: 'Loam', nameTR: 'Tın' };
}

/* ─── Validation + Hesaplama ─── */
export function hesaplaTexture(input: TextureInput): TextureResult {
  const { sand, silt, clay, ornekNo } = input;

  // Validasyon
  if (sand < 0 || silt < 0 || clay < 0) {
    throw new TextureError('Yüzde değerleri negatif olamaz.');
  }

  const total = sand + silt + clay;
  if (Math.abs(total - 100) > 1) {
    throw new TextureError(`Kum + Silt + Kil toplamı 100 olmalıdır (şu an: ${total.toFixed(1)}).`);
  }

  // Normalize (yuvarlama hataları için)
  const nSand = (sand / total) * 100;
  const nSilt = (silt / total) * 100;
  const nClay = (clay / total) * 100;

  const { name, nameTR } = classifySoilTexture(nSand, nClay, nSilt);
  const [cartX, cartY] = toCartesian(nSand, nClay, nSilt);

  return {
    ornekNo: ornekNo || 'Örnek',
    sand: nSand,
    silt: nSilt,
    clay: nClay,
    textureClass: name,
    textureClassTR: nameTR,
    cartX,
    cartY,
  };
}

/* ─── Üçgen çizimi için USDA polygon verilerini dışa aktar ─── */
export function getUSDAPolygonsCartesian(): { name: string; nameTR: string; points: [number, number][] }[] {
  return USDA_POLYGONS.map((poly) => ({
    name: poly.name,
    nameTR: poly.nameTR,
    points: poly.vertices.map(([s, c, si]) => toCartesian(s, c, si)),
  }));
}

/* ─── Grid çizgisi koordinatları ─── */
export function getGridLines(step: number = 10): { from: [number, number]; to: [number, number]; label: string; axis: 'sand' | 'clay' | 'silt' }[] {
  const lines: { from: [number, number]; to: [number, number]; label: string; axis: 'sand' | 'clay' | 'silt' }[] = [];

  for (let v = step; v < 100; v += step) {
    // Sand lines (bottom axis)
    const sandFrom = toCartesian(v, 0, 100 - v);
    const sandTo = toCartesian(v, 100 - v, 0);
    lines.push({ from: sandFrom, to: sandTo, label: `${v}`, axis: 'sand' });

    // Clay lines (left axis)
    const clayFrom = toCartesian(0, v, 100 - v);
    const clayTo = toCartesian(100 - v, v, 0);
    lines.push({ from: clayFrom, to: clayTo, label: `${v}`, axis: 'clay' });

    // Silt lines (right axis)
    const siltFrom = toCartesian(0, 100 - v, v);
    const siltTo = toCartesian(100 - v, 0, v);
    lines.push({ from: siltFrom, to: siltTo, label: `${v}`, axis: 'silt' });
  }

  return lines;
}
