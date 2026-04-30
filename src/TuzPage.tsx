import { useState, useCallback, type FormEvent } from 'react';
import { hesaplaTuz, TuzError, type TuzResult } from './lib/tuz';

interface TuzPageProps {
  project: any;
  onAddMeasurement: (r: TuzResult) => void;
  onDeleteMeasurement: (id: string) => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
}

export default function TuzPage({
  project,
  onAddMeasurement,
  onDeleteMeasurement,
  onExportPDF,
  onExportCSV,
  onExportExcel,
}: TuzPageProps) {
  const [temperature, setTemperature] = useState('');
  const [saturation, setSaturation] = useState('');
  const [resistance, setResistance] = useState('');
  const [ornekNo, setOrnekNo] = useState('');
  const [lastResult, setLastResult] = useState<TuzResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightIdx, setHighlightIdx] = useState<number | undefined>(undefined);

  const measurements = project.measurements || [];
  const results: TuzResult[] = measurements.map((m: any) => m.result);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLastResult(null);

    const temp = parseFloat(temperature);
    const sat = parseFloat(saturation);
    const res = parseFloat(resistance);

    if (isNaN(temp) || isNaN(sat) || isNaN(res)) {
      setError('Tüm sayısal değerleri doğru girin.');
      return;
    }

    try {
      const r = hesaplaTuz({
        temperature: temp,
        saturation: sat,
        resistance: res,
        ornekNo: ornekNo.trim() || `Örnek-${results.length + 1}`,
      });
      setLastResult(r);
      onAddMeasurement(r);
      setHighlightIdx(results.length);
    } catch (err) {
      if (err instanceof TuzError) setError(err.message);
      else setError('Beklenmeyen bir hata oluştu.');
    }
  }, [temperature, saturation, resistance, ornekNo, results.length, onAddMeasurement]);

  const handleReset = useCallback(() => {
    setTemperature(''); setSaturation(''); setResistance(''); setOrnekNo('');
    setLastResult(null); setError(null);
  }, []);

  return (
    <>
      <div className="main__title-row">
        <h1 className="main__title">
          {project.name}
          <span className="main__title-badge">
            {results.length} ölçüm
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

      {/* ── Form ── */}
      <section className="card" id="tuz-form-card">
        <div className="card__header">
          <div className="card__header-left">
            <span className="card__header-icon">🧪</span>
            <h2 className="card__header-title">Yeni Tuz/ECe Ölçümü</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="tuz-ornekNo">Örnek No</label>
              <input id="tuz-ornekNo" className="input" type="text" placeholder="T-001"
                value={ornekNo} onChange={e => setOrnekNo(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="tuz-temp">Sıcaklık <span className="unit">(°C)</span></label>
              <input id="tuz-temp" className="input" type="number" step="any" min="0" max="60"
                placeholder="24" value={temperature} onChange={e => setTemperature(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="tuz-sat">Saturasyon Nemi <span className="unit">(cm³)</span></label>
              <input id="tuz-sat" className="input" type="number" step="any" min="0"
                placeholder="50" value={saturation} onChange={e => setSaturation(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="tuz-res">Direnç <span className="unit">(Ohm)</span></label>
              <input id="tuz-res" className="input" type="number" step="any" min="0"
                placeholder="300" value={resistance} onChange={e => setResistance(e.target.value)} required />
            </div>
          </div>

          <div className="btn-row">
            <button type="submit" className="btn btn--primary">Hesapla</button>
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
          <div className="result-hero" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="result-hero__percentage">%{lastResult.saltPct.toFixed(2)}</div>
              <div><span className="result-hero__class class--orta">{lastResult.saltClassPct}</span></div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Toplam Tuz</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="result-hero__percentage" style={{ color: 'var(--red-600)' }}>{lastResult.ece.toFixed(1)} <span style={{ fontSize: '1rem' }}>dS/m</span></div>
              <div><span className="result-hero__class class--cok">{lastResult.saltClassEce}</span></div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>ECe (Ekstrakt)</div>
            </div>
          </div>
          <div className="result-summary" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
            <div className="result-summary__item" style={{ flex: '1 1 100%' }}>
              <div className="result-summary__label">Tavsiye Edilen Bitkiler</div>
              <div className="result-summary__value" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{lastResult.suitableCrops}</div>
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
                  <th>Örnek</th><th>Sıcaklık</th><th>Sat. (cm³)</th><th>Direnç (Ω)</th>
                  <th>% Tuz</th><th>Sınıf (%)</th><th>ECe</th><th>Sınıf (ECe)</th><th>İşlem</th>
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
                      <td>{r.temperature}°C</td>
                      <td>{r.saturation}</td>
                      <td>{r.resistance}</td>
                      <td style={{ fontWeight: 600, color: 'var(--blue-600)' }}>%{r.saltPct.toFixed(2)}</td>
                      <td><span className="badge class--orta">{r.saltClassPct}</span></td>
                      <td style={{ fontWeight: 600, color: 'var(--red-600)' }}>{r.ece.toFixed(1)}</td>
                      <td><span className="badge class--cok">{r.saltClassEce}</span></td>
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
