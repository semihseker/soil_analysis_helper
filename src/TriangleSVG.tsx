import { useMemo } from 'react';
import { toCartesian, getUSDAPolygonsCartesian, getGridLines, type TextureResult } from './lib/soil-texture';

/* ─── SVG Constants ─── */
const SVG_W = 460;
const SVG_H = 420;
const PAD = 50;
const SCALE = 3.2;

function tx(x: number) { return PAD + x * SCALE; }
function ty(y: number) { return SVG_H - PAD - y * SCALE; }

/* ─── Pastel renk paleti (polygon filleri) ─── */
const POLY_COLORS: Record<string, string> = {
  Clay: '#e8d4d4',
  'Silty Clay': '#d4d4e8',
  'Silty Clay Loam': '#cce0ec',
  'Clay Loam': '#e0d4c8',
  'Sandy Clay': '#e8ccc0',
  'Sandy Clay Loam': '#ece0cc',
  Loam: '#d4e8d4',
  'Silt Loam': '#d0e4f0',
  Silt: '#c8dce8',
  'Sandy Loam': '#e0ecd0',
  'Loamy Sand': '#ece8cc',
  Sand: '#f0ecd4',
};

interface TriangleSVGProps {
  results: TextureResult[];
  highlightIndex?: number;
}

export default function TriangleSVG({ results, highlightIndex }: TriangleSVGProps) {
  const polygons = useMemo(() => getUSDAPolygonsCartesian(), []);
  const gridLines = useMemo(() => getGridLines(10), []);

  /* Üçgen köşe noktaları */
  const corners = {
    topLeft: toCartesian(0, 100, 0),     // Clay
    bottomRight: toCartesian(100, 0, 0), // Sand
    bottomLeft: toCartesian(0, 0, 100),  // Silt
  };

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: '100%', maxWidth: 500, height: 'auto', display: 'block', margin: '0 auto' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Polygon alanları ── */}
      {polygons.map((poly) => {
        const pathD = poly.points
          .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${tx(x).toFixed(1)},${ty(y).toFixed(1)}`)
          .join(' ') + ' Z';
        return (
          <path
            key={poly.name}
            d={pathD}
            fill={POLY_COLORS[poly.name] || '#eee'}
            stroke="#b0b4bc"
            strokeWidth={0.5}
            opacity={0.7}
          />
        );
      })}

      {/* ── Grid çizgileri ── */}
      {gridLines.map((line, i) => (
        <line
          key={`grid-${i}`}
          x1={tx(line.from[0])}
          y1={ty(line.from[1])}
          x2={tx(line.to[0])}
          y2={ty(line.to[1])}
          stroke="#d0d3d8"
          strokeWidth={0.3}
          strokeDasharray="2,2"
        />
      ))}

      {/* ── Dış üçgen çerçeve ── */}
      <polygon
        points={`${tx(corners.topLeft[0])},${ty(corners.topLeft[1])} ${tx(corners.bottomRight[0])},${ty(corners.bottomRight[1])} ${tx(corners.bottomLeft[0])},${ty(corners.bottomLeft[1])}`}
        fill="none"
        stroke="#1a1e2c"
        strokeWidth={1.5}
      />

      {/* ── Polygon isimleri ── */}
      {polygons.map((poly) => {
        const cx = poly.points.reduce((s, p) => s + p[0], 0) / poly.points.length;
        const cy = poly.points.reduce((s, p) => s + p[1], 0) / poly.points.length;
        return (
          <text
            key={`label-${poly.name}`}
            x={tx(cx)}
            y={ty(cy)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={7}
            fontWeight={500}
            fill="#3a3f4d"
            style={{ pointerEvents: 'none' }}
          >
            {poly.nameTR}
          </text>
        );
      })}

      {/* ── Eksen etiketleri ── */}
      {/* Kum (Sand) — alt kenar, sağdan sola */}
      <text x={tx(50)} y={ty(-10)} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1a1e2c">
        Kum (%)
      </text>
      {/* Kil (Clay) — sol kenar, aşağıdan yukarı */}
      <text
        x={tx(25) - 24}
        y={ty(43) + 5}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="#1a1e2c"
        transform={`rotate(-60, ${tx(25) - 24}, ${ty(43) + 5})`}
      >
        Kil (%)
      </text>
      {/* Silt — sağ kenar, yukarıdan aşağı */}
      <text
        x={tx(75) + 24}
        y={ty(43) + 5}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="#1a1e2c"
        transform={`rotate(60, ${tx(75) + 24}, ${ty(43) + 5})`}
      >
        Silt (%)
      </text>

      {/* ── Ölçek sayıları — Kum (alt) ── */}
      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => {
        const [x, y] = toCartesian(v, 0, 100 - v);
        return (
          <text key={`sand-${v}`} x={tx(x)} y={ty(y) + 14} textAnchor="middle" fontSize={7} fill="#666">
            {v}
          </text>
        );
      })}
      {/* ── Ölçek sayıları — Kil (sol) ── */}
      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => {
        const [x, y] = toCartesian(0, v, 100 - v);
        return (
          <text key={`clay-${v}`} x={tx(x) - 10} y={ty(y) + 3} textAnchor="end" fontSize={7} fill="#666">
            {v}
          </text>
        );
      })}
      {/* ── Ölçek sayıları — Silt (sağ) ── */}
      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => {
        const [x, y] = toCartesian(100 - v, v, 0);
        return (
          <text key={`silt-${v}`} x={tx(x) + 10} y={ty(y) + 3} textAnchor="start" fontSize={7} fill="#666">
            {100 - v}
          </text>
        );
      })}

      {/* ── Veri noktaları ── */}
      {results.map((r, i) => (
        <g key={`point-${i}`}>
          <circle
            cx={tx(r.cartX)}
            cy={ty(r.cartY)}
            r={i === highlightIndex ? 6 : 4}
            fill={i === highlightIndex ? '#e63946' : '#4a7cde'}
            stroke="#fff"
            strokeWidth={1.5}
            opacity={0.9}
          />
          <title>{`${r.ornekNo}: ${r.textureClassTR}\n(Kum: ${r.sand.toFixed(1)}%, Silt: ${r.silt.toFixed(1)}%, Kil: ${r.clay.toFixed(1)}%)`}</title>
        </g>
      ))}
    </svg>
  );
}
