import { useState, useCallback, type FormEvent } from 'react';
import { hesaplaTexture, TextureError, type TextureResult } from './lib/soil-texture';
import TriangleSVG from './TriangleSVG';

interface TexturePageProps {
  onSave: (result: TextureResult) => void;
  defaultOrnekNo?: string;
}

export default function TexturePage({ onSave, defaultOrnekNo = '' }: TexturePageProps) {
  const [sand, setSand] = useState('');
  const [silt, setSilt] = useState('');
  const [clay, setClay] = useState('');
  const [ornekNo, setOrnekNo] = useState(defaultOrnekNo);
  const [lastResult, setLastResult] = useState<TextureResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        ornekNo: ornekNo.trim() || 'Örnek',
      });
      setLastResult(r);
      onSave(r);
    } catch (err) {
      if (err instanceof TextureError) setError(err.message);
      else setError('Beklenmeyen bir hata oluştu.');
    }
  }, [sand, silt, clay, ornekNo, onSave]);

  const handleReset = useCallback(() => {
    setSand(''); setSilt(''); setClay('');
    setLastResult(null); setError(null);
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
          <span style={{ fontSize: '0.78rem', color: remaining >= 0 ? 'var(--text-muted)' : 'var(--red-500)' }}>
            Kalan: %{remaining.toFixed(1)} (Kil)
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="tex-ornekNo">Örnek No</label>
              <input id="tex-ornekNo" className="input" type="text" placeholder="T-001"
                value={ornekNo} onChange={e => setOrnekNo(e.target.value)} required />
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
        </section>
      )}

      {/* ── Üçgen Grafiği (Küçük Önizleme) ── */}
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
