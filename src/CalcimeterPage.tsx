import { useState, useCallback, type FormEvent } from 'react';
import { hesapla, CalcimeterError, type CalcimeterResult, type CalcimeterWarning } from './lib/calcimeter';

interface CalcimeterPageProps {
  onSave: (result: CalcimeterResult) => void;
  defaultOrnekNo?: string;
}

export default function CalcimeterPage({ onSave, defaultOrnekNo = '' }: CalcimeterPageProps) {
  const [ornekNo, setOrnekNo] = useState(defaultOrnekNo);
  const [agirlik, setAgirlik] = useState('');
  const [sicaklik, setSicaklik] = useState('');
  const [basinc, setBasinc] = useState('');
  const [basincBirimi, setBasincBirimi] = useState<'mmHg' | 'mbar'>('mmHg');
  const [okuma, setOkuma] = useState('');

  const [lastResult, setLastResult] = useState<CalcimeterResult | null>(null);
  const [warnings, setWarnings] = useState<CalcimeterWarning[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarnings([]);
    setLastResult(null);

    const input = {
      ornekNo: ornekNo.trim() || 'Örnek',
      agirlik: parseFloat(agirlik),
      sicaklik: parseFloat(sicaklik),
      basinc: parseFloat(basinc),
      basincBirimi,
      okuma: parseFloat(okuma),
    };

    if (isNaN(input.agirlik) || isNaN(input.sicaklik) || isNaN(input.basinc) || isNaN(input.okuma)) {
      setError('Tüm sayısal alanları doğru doldurun.');
      return;
    }

    try {
      const { result: r, warnings: w } = hesapla(input);
      setLastResult(r);
      setWarnings(w);
      onSave(r);
    } catch (err) {
      if (err instanceof CalcimeterError) setError(err.message);
      else setError('Beklenmeyen bir hata oluştu.');
    }
  }, [ornekNo, agirlik, sicaklik, basinc, basincBirimi, okuma, onSave]);

  const handleReset = useCallback(() => {
    setOrnekNo(''); setAgirlik(''); setSicaklik(''); setBasinc(''); setOkuma('');
    setLastResult(null); setWarnings([]); setError(null);
  }, []);

  function classForSinif(sinif: string): string {
    if (sinif.startsWith('Az')) return 'class--az';
    if (sinif === 'Kireçli') return 'class--kirecli';
    if (sinif.startsWith('Orta')) return 'class--orta';
    if (sinif.startsWith('Fazla')) return 'class--fazla';
    return 'class--cok';
  }

  return (
    <>
      <section className="card" id="form-card">
        <div className="card__header">
          <div className="card__header-left">
            <span className="card__header-icon">⚗️</span>
            <h2 className="card__header-title">Kireç Analizi Ekle/Güncelle</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} id="calcimeter-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="ornekNo">Örnek No</label>
              <input id="ornekNo" className="input" type="text" placeholder="T-001"
                value={ornekNo} onChange={(e) => setOrnekNo(e.target.value)} required />
            </div>

            <div className="form-group">
              <label htmlFor="agirlik">Ağırlık <span className="unit">(g)</span></label>
              <input id="agirlik" className="input" type="number" step="any" min="0.001"
                placeholder="0.5" value={agirlik} onChange={(e) => setAgirlik(e.target.value)} required />
            </div>

            <div className="form-group">
              <label htmlFor="sicaklik">Sıcaklık <span className="unit">(°C)</span></label>
              <input id="sicaklik" className="input" type="number" step="any"
                placeholder="24" value={sicaklik} onChange={(e) => setSicaklik(e.target.value)} required />
            </div>

            <div className="form-group">
              <label htmlFor="basinc">Basınç <span className="unit">({basincBirimi})</span></label>
              <div className="input-inline">
                <input id="basinc" className="input" type="number" step="any"
                  placeholder="759" value={basinc} onChange={(e) => setBasinc(e.target.value)} required />
                <select id="basincBirimi" className="input select"
                  value={basincBirimi} onChange={(e) => setBasincBirimi(e.target.value as 'mmHg' | 'mbar')}>
                  <option value="mmHg">mmHg</option>
                  <option value="mbar">mbar</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="okuma">Okuma <span className="unit">(cm³)</span></label>
              <input id="okuma" className="input" type="number" step="any" min="0"
                placeholder="15" value={okuma} onChange={(e) => setOkuma(e.target.value)} required />
            </div>
          </div>

          <div className="btn-row">
            <button type="submit" className="btn btn--primary" id="btn-calculate">Kaydet</button>
            <button type="button" className="btn btn--secondary" onClick={handleReset} id="btn-reset">Temizle</button>
          </div>
        </form>
      </section>

      {error && (
        <div className="alert alert--error" style={{ marginTop: '0.75rem' }} id="error-alert">
          <span className="alert__icon">⛔</span><span>{error}</span>
        </div>
      )}
      {warnings.map((w, i) => (
        <div className="alert alert--warning" style={{ marginTop: i === 0 ? '0.75rem' : '0.35rem' }} key={i}>
          <span className="alert__icon">⚠️</span><span>{w.message}</span>
        </div>
      ))}

      {lastResult && (
        <section className="card" style={{ marginTop: '1.25rem' }} id="result-card">
          <div className="card__header">
            <div className="card__header-left">
              <span className="card__header-icon">📊</span>
              <h2 className="card__header-title">Son Kaydedilen — {lastResult.ornekNo}</h2>
            </div>
          </div>
          <div className="result-hero">
            <div className="result-hero__percentage" id="result-percentage">
              {lastResult.caco3Yuzde.toFixed(2)}<span className="pct">%</span>
            </div>
            <div>
              <span className={`result-hero__class ${classForSinif(lastResult.sinif)}`} id="result-class">
                {lastResult.sinif}
              </span>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
