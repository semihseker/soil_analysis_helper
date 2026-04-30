import { useState, useCallback, type FormEvent } from 'react';
import { hesaplaTexture, TextureError, type TextureResult } from './lib/soil-texture';
import TriangleSVG from './TriangleSVG';

interface TexturePageProps {
  project: any;
  onAddMeasurement: (r: TextureResult) => void;
  onDeleteMeasurement: (id: string) => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
}

export default function TexturePage({
  project,
  onAddMeasurement,
  onDeleteMeasurement,
  onExportPDF,
  onExportCSV,
  onExportExcel,
}: TexturePageProps) {
  const [sand, setSand] = useState('');
  const [silt, setSilt] = useState('');
  const [clay, setClay] = useState('');
  const [ornekNo, setOrnekNo] = useState('');
  const [lastResult, setLastResult] = useState<TextureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightIdx, setHighlightIdx] = useState<number | undefined>(undefined);

  const measurements = project.measurements || [];
  const results: TextureResult[] = measurements.map((m: any) => m.result);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLastResult(null);

    const s = parseFloat(sand);
    const si = parseFloat(silt);
    const c = parseFloat(clay);

    if (isNaN(s) || isNaN(si) || isNaN(c)) {
      setError('Tüm yüzde değerlerini doğru girin.');
      return;
    }

    try {
      const r = hesaplaTexture({
        sand: s, silt: si, clay: c,
        ornekNo: ornekNo.trim() || `Örnek-${results.length + 1}`,
      });
      setLastResult(r);
      onAddMeasurement(r);
      setHighlightIdx(results.length);
    } catch (err) {
      if (err instanceof TextureError) setError(err.message);
      else setError('Beklenmeyen bir hata oluştu.');
    }
  }, [sand, silt, clay, ornekNo, results.length, onAddMeasurement]);

  const handleReset = useCallback(() => {
    setSand(''); setSilt(''); setClay(''); setOrnekNo('');
    setLastResult(null); setError(null);
  }, []);

  const remaining = 100 - (parseFloat(sand) || 0) - (parseFloat(silt) || 0);

  return (
    <>
      <div className="main__title-row">
        <h1 className="main__title">
          {project.name}
          <span className="main__title-badge">
            {results.length} nokta
          </span>
        </h1>
        {results.length > 0 && (
          <div className="export-btns">
            <button className="btn btn--green-sm" onClick={onExportExcel}>
              📊 Excel
            </button>
            <button className="btn btn--green-sm" onClick={onExportCSV}>
              📥 CSV
            </button>
            <button className="btn btn--red-sm" onClick={onExportPDF}>
              📄 PDF Rapor
            </button>
          </div>
        )}
      </div>

      {/* ── Üçgen Grafiği ── */}
      <section className="card" id="triangle-card">
        <div className="card__header">
          <div className="card__header-left">
            <span className="card__header-icon">📐</span>
            <h2 className="card__header-title">USDA Tekstür Üçgeni</h2>
          </div>
        </div>
        <TriangleSVG results={results} highlightIndex={highlightIdx} />
      </section>

      {/* ── Form ── */}
      <section className="card" id="texture-form-card">
        <div className="card__header">
          <div className="card__header-left">
            <span className="card__header-icon">📋</span>
            <h2 className="card__header-title">Yeni Tekstür Analizi</h2>
          </div>
          <span style={{ fontSize: '0.78rem', color: remaining >= 0 ? 'var(--text-muted)' : 'var(--red-500)' }}>
            Kalan: %{remaining.toFixed(1)} (Kil)
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="tex-ornekNo">Örnek No</label>
              <input id="tex-ornekNo" className="input" type="text" placeholder="T-001"
                value={ornekNo} onChange={e => setOrnekNo(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="tex-sand">Kum <span className="unit">(%)</span></label>
              <input id="tex-sand" className="input" type="number" step="any" min="0" max="100"
                placeholder="40" value={sand} onChange={e => setSand(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="tex-silt">Silt <span className="unit">(%)</span></label>
              <input id="tex-silt" className="input" type="number" step="any" min="0" max="100"
                placeholder="40" value={silt} onChange={e => setSilt(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="tex-clay">Kil <span className="unit">(%)</span></label>
              <input id="tex-clay" className="input" type="number" step="any" min="0" max="100"
                placeholder="20" value={clay} onChange={e => setClay(e.target.value)} required />
            </div>
          </div>

          <div className="btn-row">
            <button type="submit" className="btn btn--primary">Sınıflandır</button>
            <button type="button" className="btn btn--secondary" onClick={handleReset}>Temizle</button>
          </div>
        </form>
      </section>

      {/* ── Error ── */}
      {error && (
        <div className="alert alert--error" style={{ marginTop: '0.75rem' }}>
          <span className="alert__icon">⛔</span><span>{error}</span>
        </div>
      )}

      {/* ── Son Sonuç ── */}
      {lastResult && (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <div className="card__header">
            <div className="card__header-left">
              <span className="card__header-icon">📊</span>
              <h2 className="card__header-title">Sonuç — {lastResult.ornekNo}</h2>
            </div>
          </div>
          <div className="result-hero">
            <div className="result-hero__percentage">{lastResult.textureClassTR}</div>
            <div>
              <span className="result-hero__class class--orta" style={{ marginTop: '0.75rem' }}>
                {lastResult.textureClass}
              </span>
            </div>
          </div>
          <div className="result-summary">
            <div className="result-summary__item">
              <div className="result-summary__label">Kum</div>
              <div className="result-summary__value">{lastResult.sand.toFixed(1)}<span className="result-summary__unit">%</span></div>
            </div>
            <div className="result-summary__item">
              <div className="result-summary__label">Silt</div>
              <div className="result-summary__value">{lastResult.silt.toFixed(1)}<span className="result-summary__unit">%</span></div>
            </div>
            <div className="result-summary__item">
              <div className="result-summary__label">Kil</div>
              <div className="result-summary__value">{lastResult.clay.toFixed(1)}<span className="result-summary__unit">%</span></div>
            </div>
          </div>
        </section>
      )}

      {/* ── Geçmiş Tablosu ── */}
      {measurements.length > 0 && (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <div className="card__header">
            <div className="card__header-left">
              <span className="card__header-icon">📜</span>
              <h2 className="card__header-title">Analiz Geçmişi</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Örnek</th><th>Kum %</th><th>Silt %</th><th>Kil %</th>
                  <th>Sınıf (TR)</th><th>Sınıf (EN)</th><th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m: any, i: number) => {
                  const r = m.result;
                  return (
                    <tr key={m.id}
                      style={{ cursor: 'pointer', background: i === highlightIdx ? 'var(--blue-50)' : undefined }}
                      onClick={() => setHighlightIdx(i)}
                    >
                      <td style={{ fontWeight: 500 }}>{r.ornekNo}</td>
                      <td>{r.sand.toFixed(1)}</td>
                      <td>{r.silt.toFixed(1)}</td>
                      <td>{r.clay.toFixed(1)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--blue-600)' }}>{r.textureClassTR}</td>
                      <td><span className="badge class--orta">{r.textureClass}</span></td>
                      <td>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteMeasurement(m.id); }}
                          style={{
                            background: 'transparent', border: 'none', color: '#ef4444',
                            cursor: 'pointer', padding: '0.2rem', fontSize: '1rem',
                          }}
                          title="Sil"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
