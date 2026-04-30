import { useState, useCallback, type FormEvent } from 'react';
import { hesaplaTuz, TuzError, type TuzResult } from './lib/tuz';

interface TuzPageProps {
  onSave: (result: TuzResult) => void;
  defaultOrnekNo?: string;
}

export default function TuzPage({ onSave, defaultOrnekNo = '' }: TuzPageProps) {
  const [temperature, setTemperature] = useState('');
  const [saturation, setSaturation] = useState('');
  const [resistance, setResistance] = useState('');
  const [ornekNo, setOrnekNo] = useState(defaultOrnekNo);
  const [lastResult, setLastResult] = useState<TuzResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        ornekNo: ornekNo.trim() || 'Örnek',
      });
      setLastResult(r);
      onSave(r);
    } catch (err) {
      if (err instanceof TuzError) setError(err.message);
      else setError('Beklenmeyen bir hata oluştu.');
    }
  }, [temperature, saturation, resistance, ornekNo, onSave]);

  const handleReset = useCallback(() => {
    setTemperature(''); setSaturation(''); setResistance('');
    setLastResult(null); setError(null);
  }, []);

  return (
    <>
      <section className="card" id="tuz-form-card">
        <div className="card__header">
          <div className="card__header-left">
            <span className="card__header-icon">🧪</span>
            <h2 className="card__header-title">Tuz/ECe Analizi Ekle/Güncelle</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="tuz-ornekNo">Örnek No</label>
              <input id="tuz-ornekNo" className="input" type="text" placeholder="T-001"
                value={ornekNo} onChange={e => setOrnekNo(e.target.value)} required />
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
        </section>
      )}
    </>
  );
}
