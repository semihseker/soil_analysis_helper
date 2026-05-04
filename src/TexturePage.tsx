import { useState, useCallback, type FormEvent } from 'react';
import { hesaplaTexture, hesaplaHydrometer, TextureError, type TextureResult, type HydrometerResult } from './lib/soil-texture';
import TriangleSVG from './TriangleSVG';

interface TexturePageProps {
  onSave: (result: TextureResult) => void;
  defaultOrnekNo?: string;
}

type InputMode = 'direct' | 'hydrometer';

export default function TexturePage({ onSave, defaultOrnekNo = '' }: TexturePageProps) {
  const [mode, setMode] = useState<InputMode>('hydrometer');

  // Direct input
  const [sand, setSand] = useState('');
  const [silt, setSilt] = useState('');
  const [clay, setClay] = useState('');

  // Hydrometer input
  const [okuma40sn, setOkuma40sn] = useState('');
  const [okuma2saat, setOkuma2saat] = useState('');
  const [sicaklik40sn, setSicaklik40sn] = useState('');
  const [sicaklik2saat, setSicaklik2saat] = useState('');

  const [ornekNo, setOrnekNo] = useState(defaultOrnekNo);
  const [lastResult, setLastResult] = useState<TextureResult | null>(null);
  const [hydroResult, setHydroResult] = useState<HydrometerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLastResult(null);
    setHydroResult(null);

    try {
      if (mode === 'direct') {
        const s = parseFloat(sand);
        const si = parseFloat(silt);
        const c = parseFloat(clay);

        if (isNaN(s) || isNaN(si) || isNaN(c)) {
          setError('Tüm yüzde değerlerini doğru girin.');
          return;
        }

        const r = hesaplaTexture({
          sand: s, silt: si, clay: c,
          ornekNo: ornekNo.trim() || 'Örnek',
        });
        setLastResult(r);
        onSave(r);
      } else {
        const o40 = parseFloat(okuma40sn);
        const o2h = parseFloat(okuma2saat);
        const s40 = parseFloat(sicaklik40sn);
        const s2h = parseFloat(sicaklik2saat);

        if (isNaN(o40) || isNaN(o2h) || isNaN(s40) || isNaN(s2h)) {
          setError('Tüm okuma ve sıcaklık değerlerini doğru girin.');
          return;
        }

        const r = hesaplaHydrometer({
          okuma40sn: o40,
          okuma2saat: o2h,
          sicaklik40sn: s40,
          sicaklik2saat: s2h,
          ornekNo: ornekNo.trim() || 'Örnek',
        });
        setLastResult(r);
        setHydroResult(r);
        onSave(r);
      }
    } catch (err) {
      if (err instanceof TextureError) setError(err.message);
      else setError('Beklenmeyen bir hata oluştu.');
    }
  }, [mode, sand, silt, clay, okuma40sn, okuma2saat, sicaklik40sn, sicaklik2saat, ornekNo, onSave]);

  const handleReset = useCallback(() => {
    setSand(''); setSilt(''); setClay('');
    setOkuma40sn(''); setOkuma2saat(''); setSicaklik40sn(''); setSicaklik2saat('');
    setLastResult(null); setHydroResult(null); setError(null);
  }, []);

  const remaining = 100 - (parseFloat(sand) || 0) - (parseFloat(silt) || 0);

  return (
    <>
      <section className="card" id="texture-form-card">
        <div className="card__header">
          <div className="card__header-left">
            <span className="card__header-icon">📋</span>
            <h2 className="card__header-title">Tekstür Analizi Ekle/Güncelle</h2>
          </div>
        </div>

        {/* ── Yöntem Seçimi ── */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', padding: '0 0.25rem' }}>
          <button
            type="button"
            className={`btn ${mode === 'hydrometer' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setMode('hydrometer')}
            style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}
          >
            🔬 Hidrometre Yöntemi
          </button>
          <button
            type="button"
            className={`btn ${mode === 'direct' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setMode('direct')}
            style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}
          >
            📊 Doğrudan Yüzde Girişi
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="tex-ornekNo">Örnek No</label>
              <input id="tex-ornekNo" className="input" type="text" placeholder="T-001"
                value={ornekNo} onChange={e => setOrnekNo(e.target.value)} required />
            </div>

            {mode === 'direct' ? (
              <>
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
              </>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="tex-okuma40">40 sn Okuma <span className="unit">(g/L)</span></label>
                  <input id="tex-okuma40" className="input" type="number" step="any" min="0"
                    placeholder="38.5" value={okuma40sn} onChange={e => setOkuma40sn(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="tex-sic40">40 sn Sıcaklık <span className="unit">(°C)</span></label>
                  <input id="tex-sic40" className="input" type="number" step="any"
                    placeholder="24.25" value={sicaklik40sn} onChange={e => setSicaklik40sn(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="tex-okuma2h">2 saat Okuma <span className="unit">(g/L)</span></label>
                  <input id="tex-okuma2h" className="input" type="number" step="any" min="0"
                    placeholder="4.75" value={okuma2saat} onChange={e => setOkuma2saat(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="tex-sic2h">2 saat Sıcaklık <span className="unit">(°C)</span></label>
                  <input id="tex-sic2h" className="input" type="number" step="any"
                    placeholder="21.5" value={sicaklik2saat} onChange={e => setSicaklik2saat(e.target.value)} required />
                </div>
              </>
            )}
          </div>

          {mode === 'direct' && (
            <div style={{ fontSize: '0.78rem', color: remaining >= 0 ? 'var(--text-muted)' : 'var(--red-500)', margin: '0.5rem 0', paddingLeft: '0.25rem' }}>
              Kalan: %{remaining.toFixed(1)} (Kil)
            </div>
          )}

          <div className="btn-row">
            <button type="submit" className="btn btn--primary">Kaydet</button>
            <button type="button" className="btn btn--secondary" onClick={handleReset}>Temizle</button>
          </div>
        </form>
      </section>

      {error && (
        <div className="alert alert--error" style={{ marginTop: '0.75rem' }}>
          <span className="alert__icon">⛔</span><span>{error}</span>
        </div>
      )}

      {lastResult && (
        <section className="card" style={{ marginTop: '1.25rem' }}>
          <div className="card__header">
            <div className="card__header-left">
              <span className="card__header-icon">📊</span>
              <h2 className="card__header-title">Son Kaydedilen — {lastResult.ornekNo}</h2>
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
              <div className="result-summary__value">{lastResult.sand.toFixed(2)}<span className="result-summary__unit">%</span></div>
            </div>
            <div className="result-summary__item">
              <div className="result-summary__label">Silt</div>
              <div className="result-summary__value">{lastResult.silt.toFixed(2)}<span className="result-summary__unit">%</span></div>
            </div>
            <div className="result-summary__item">
              <div className="result-summary__label">Kil</div>
              <div className="result-summary__value">{lastResult.clay.toFixed(2)}<span className="result-summary__unit">%</span></div>
            </div>
            {hydroResult && (
              <>
                <div className="result-summary__item">
                  <div className="result-summary__label">Düz. 40sn Okuma</div>
                  <div className="result-summary__value">{hydroResult.duzeltilmis40sn.toFixed(2)}<span className="result-summary__unit">g/L</span></div>
                </div>
                <div className="result-summary__item">
                  <div className="result-summary__label">Düz. 2saat Okuma</div>
                  <div className="result-summary__value">{hydroResult.duzeltilmis2saat.toFixed(2)}<span className="result-summary__unit">g/L</span></div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── Üçgen Grafiği ── */}
      <section className="card" style={{ marginTop: '1.25rem' }}>
        <div className="card__header">
          <div className="card__header-left">
            <span className="card__header-icon">📐</span>
            <h2 className="card__header-title">USDA Tekstür Üçgeni</h2>
          </div>
        </div>
        <TriangleSVG results={lastResult ? [lastResult] : []} highlightIndex={lastResult ? 0 : undefined} />
      </section>
    </>
  );
}
