import { useState, useCallback, useEffect, type FormEvent } from 'react';
import {
  hesapla,
  CalcimeterError,
  type CalcimeterInput,
  type CalcimeterResult,
  type CalcimeterWarning,
} from './lib/calcimeter';
import {
  loadState,
  saveState,
  createProject,
  deleteProject,
  addMeasurement,
  deleteMeasurement,
  getActiveProject,
  exportProjectCSV,
  downloadCSV,
  type AppState,
} from './lib/store';
import { exportProjectPDF } from './lib/pdf-export';
import './index.css';

/* ─── Helpers ─── */
function classForSinif(sinif: string): string {
  if (sinif.startsWith('Az')) return 'class--az';
  if (sinif === 'Kireçli') return 'class--kirecli';
  if (sinif.startsWith('Orta')) return 'class--orta';
  if (sinif.startsWith('Fazla')) return 'class--fazla';
  return 'class--cok';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  /* ─── App State ─── */
  const [state, setState] = useState<AppState>(() => loadState());
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Persist
  useEffect(() => { saveState(state); }, [state]);

  const activeProject = getActiveProject(state);

  /* ─── Form State ─── */
  const [ornekNo, setOrnekNo] = useState('');
  const [agirlik, setAgirlik] = useState('');
  const [sicaklik, setSicaklik] = useState('');
  const [basinc, setBasinc] = useState('');
  const [basincBirimi, setBasincBirimi] = useState<'mmHg' | 'mbar'>('mmHg');
  const [okuma, setOkuma] = useState('');

  const [lastResult, setLastResult] = useState<CalcimeterResult | null>(null);
  const [warnings, setWarnings] = useState<CalcimeterWarning[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* ─── Project Handlers ─── */
  const handleCreateProject = useCallback(() => {
    const name = newProjectName.trim();
    if (!name) return;
    setState((s) => createProject(s, name));
    setNewProjectName('');
    setShowNewProject(false);
    setLastResult(null);
  }, [newProjectName]);

  const handleDeleteProject = useCallback((id: string) => {
    setState((s) => deleteProject(s, id));
    setDeleteConfirmId(null);
    setLastResult(null);
  }, []);

  const handleSelectProject = useCallback((id: string) => {
    setState((s) => ({ ...s, activeProjectId: id }));
    setLastResult(null);
    setError(null);
    setWarnings([]);
  }, []);

  /* ─── Form Handlers ─── */
  const handleReset = useCallback(() => {
    setOrnekNo('');
    setAgirlik('');
    setSicaklik('');
    setBasinc('');
    setOkuma('');
    setLastResult(null);
    setWarnings([]);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setWarnings([]);
      setLastResult(null);

      if (!activeProject) {
        setError('Önce bir proje oluşturun veya seçin.');
        return;
      }

      const input: CalcimeterInput = {
        ornekNo: ornekNo.trim() || `Örnek-${activeProject.measurements.length + 1}`,
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
        setState((s) => addMeasurement(s, activeProject.id, r));
      } catch (err) {
        if (err instanceof CalcimeterError) {
          setError(err.message);
        } else {
          setError('Beklenmeyen bir hata oluştu.');
        }
      }
    },
    [ornekNo, agirlik, sicaklik, basinc, basincBirimi, okuma, activeProject]
  );

  const handleDeleteMeasurement = useCallback(
    (measurementId: string) => {
      if (!activeProject) return;
      setState((s) => deleteMeasurement(s, activeProject.id, measurementId));
    },
    [activeProject]
  );

  const handleExportCSV = useCallback(() => {
    if (!activeProject || activeProject.measurements.length === 0) return;
    const csv = exportProjectCSV(activeProject);
    const safeName = activeProject.name.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_\- ]/g, '').replace(/\s+/g, '_');
    downloadCSV(csv, `${safeName}_CaCO3_sonuclari.csv`);
  }, [activeProject]);

  const handleExportPDF = useCallback(async () => {
    if (!activeProject || activeProject.measurements.length === 0) return;
    await exportProjectPDF(activeProject);
  }, [activeProject]);

  /* ─── Render ─── */
  return (
    <div className="layout">
      {/* ════════ Sidebar ════════ */}
      <aside className="sidebar">
        <div className="sidebar__header">
          <div className="sidebar__brand">
            <img src="/logo.png" alt="ESOGÜ" className="sidebar__brand-logo" />
            <div className="sidebar__brand-text">
              <div className="sidebar__brand-name">Eskişehir Osmangazi Üniversitesi</div>
              <div className="sidebar__brand-dept">Toprak Bilimi ve Bitki Besleme Bölümü</div>
              <div className="sidebar__brand-lab">Analiz Laboratuvarı — Kireç Tayini</div>
            </div>
          </div>
        </div>

        <div className="sidebar__new-project">
          <button
            className="btn-new-project"
            onClick={() => setShowNewProject(true)}
            id="btn-new-project"
          >
            + Yeni Proje
          </button>
        </div>

        <div className="sidebar__projects">
          <div className="sidebar__section-label">Projeler</div>
          {state.projects.length === 0 && (
            <div style={{ padding: '1rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Henüz proje yok.
            </div>
          )}
          {state.projects.map((p) => (
            <div
              key={p.id}
              className={`project-item ${p.id === state.activeProjectId ? 'project-item--active' : ''}`}
              onClick={() => handleSelectProject(p.id)}
            >
              <span className="project-item__icon">📁</span>
              <span className="project-item__name">{p.name}</span>
              <span className="project-item__count">{p.measurements.length}</span>
              {deleteConfirmId === p.id ? (
                <div className="delete-confirm" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleDeleteProject(p.id)}>Sil</button>
                  <button onClick={() => setDeleteConfirmId(null)}>İptal</button>
                </div>
              ) : (
                <button
                  className="project-item__delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(p.id);
                  }}
                  title="Projeyi sil"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="sidebar__footer">
          ESOGÜ — Toprak Bilimi ve Bitki Besleme
        </div>
      </aside>

      {/* ════════ Main ════════ */}
      <main className="main">
        {!activeProject ? (
          /* ── No project selected ── */
          <div style={{ textAlign: 'center', paddingTop: '6rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.3 }}>📂</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 500 }}>
              Başlamak için bir proje oluşturun
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
              Sol panelden "Yeni Proje" butonuna tıklayın.
            </div>
          </div>
        ) : (
          <>
            {/* ── Title ── */}
            <div className="main__title-row">
              <h1 className="main__title">
                {activeProject.name}
                <span className="main__title-badge">
                  {activeProject.measurements.length} ölçüm
                </span>
              </h1>
              {activeProject.measurements.length > 0 && (
                <div className="export-btns">
                  <button className="btn btn--green-sm" onClick={handleExportCSV} id="btn-export-csv">
                    📥 CSV
                  </button>
                  <button className="btn btn--red-sm" onClick={handleExportPDF} id="btn-export-pdf">
                    📄 PDF Rapor
                  </button>
                </div>
              )}
            </div>

            {/* ── Form Card ── */}
            <section className="card" id="form-card">
              <div className="card__header">
                <div className="card__header-left">
                  <span className="card__header-icon">📋</span>
                  <h2 className="card__header-title">Yeni Ölçüm</h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} id="calcimeter-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="ornekNo">Örnek No</label>
                    <input
                      id="ornekNo"
                      className="input"
                      type="text"
                      placeholder="T-001"
                      value={ornekNo}
                      onChange={(e) => setOrnekNo(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="agirlik">
                      Ağırlık <span className="unit">(g)</span>
                    </label>
                    <input
                      id="agirlik"
                      className="input"
                      type="number"
                      step="any"
                      min="0.001"
                      placeholder="0.5"
                      value={agirlik}
                      onChange={(e) => setAgirlik(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="sicaklik">
                      Sıcaklık <span className="unit">(°C)</span>
                    </label>
                    <input
                      id="sicaklik"
                      className="input"
                      type="number"
                      step="any"
                      placeholder="24"
                      value={sicaklik}
                      onChange={(e) => setSicaklik(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="basinc">
                      Basınç <span className="unit">({basincBirimi})</span>
                    </label>
                    <div className="input-inline">
                      <input
                        id="basinc"
                        className="input"
                        type="number"
                        step="any"
                        placeholder="759"
                        value={basinc}
                        onChange={(e) => setBasinc(e.target.value)}
                        required
                      />
                      <select
                        id="basincBirimi"
                        className="input select"
                        value={basincBirimi}
                        onChange={(e) => setBasincBirimi(e.target.value as 'mmHg' | 'mbar')}
                      >
                        <option value="mmHg">mmHg</option>
                        <option value="mbar">mbar</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="okuma">
                      Okuma <span className="unit">(cm³)</span>
                    </label>
                    <input
                      id="okuma"
                      className="input"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="15"
                      value={okuma}
                      onChange={(e) => setOkuma(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="btn-row">
                  <button type="submit" className="btn btn--primary" id="btn-calculate">
                    Hesapla
                  </button>
                  <button type="button" className="btn btn--secondary" onClick={handleReset} id="btn-reset">
                    Temizle
                  </button>
                </div>
              </form>
            </section>

            {/* ── Alerts ── */}
            {error && (
              <div className="alert alert--error" style={{ marginTop: '0.75rem' }} id="error-alert">
                <span className="alert__icon">⛔</span>
                <span>{error}</span>
              </div>
            )}
            {warnings.map((w, i) => (
              <div className="alert alert--warning" style={{ marginTop: i === 0 ? '0.75rem' : '0.35rem' }} key={i}>
                <span className="alert__icon">⚠️</span>
                <span>{w.message}</span>
              </div>
            ))}

            {/* ── Last Result ── */}
            {lastResult && (
              <section className="card" style={{ marginTop: '1.25rem' }} id="result-card">
                <div className="card__header">
                  <div className="card__header-left">
                    <span className="card__header-icon">📊</span>
                    <h2 className="card__header-title">Son Hesaplama — {lastResult.ornekNo}</h2>
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

                <div className="result-summary">
                  <div className="result-summary__item">
                    <div className="result-summary__label">Buhar Basıncı (e)</div>
                    <div className="result-summary__value">
                      {lastResult.buharBasinci.toFixed(4)}
                      <span className="result-summary__unit">mmHg</span>
                    </div>
                  </div>
                  <div className="result-summary__item">
                    <div className="result-summary__label">Düzeltilmiş Hacim (V₀)</div>
                    <div className="result-summary__value">
                      {lastResult.duzeltilmisHacim.toFixed(4)}
                      <span className="result-summary__unit">cm³</span>
                    </div>
                  </div>
                  <div className="result-summary__item">
                    <div className="result-summary__label">Ağırlık</div>
                    <div className="result-summary__value">
                      {lastResult.agirlik}<span className="result-summary__unit">g</span>
                    </div>
                  </div>
                  <div className="result-summary__item">
                    <div className="result-summary__label">Basınç</div>
                    <div className="result-summary__value">
                      {lastResult.basincMmHg.toFixed(1)}
                      <span className="result-summary__unit">mmHg</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── History Table ── */}
            <section className="card" style={{ marginTop: '1.25rem' }} id="history-card">
              <div className="card__header">
                <div className="card__header-left">
                  <span className="card__header-icon">📜</span>
                  <h2 className="card__header-title">Ölçüm Geçmişi</h2>
                </div>
                {activeProject.measurements.length > 0 && (
                  <div className="export-btns">
                    <button className="btn btn--outline-sm" onClick={handleExportCSV}>
                      📥 CSV
                    </button>
                    <button className="btn btn--outline-sm" onClick={handleExportPDF}>
                      📄 PDF
                    </button>
                  </div>
                )}
              </div>

              {activeProject.measurements.length === 0 ? (
                <div className="history-empty">
                  <span className="history-empty__icon">🔬</span>
                  Bu projede henüz ölçüm yok.
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Örnek</th>
                        <th>Tarih</th>
                        <th>Ağırlık</th>
                        <th>Sıcaklık</th>
                        <th>Okuma</th>
                        <th>% CaCO₃</th>
                        <th>Sınıf</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeProject.measurements.map((m) => (
                        <tr key={m.id}>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.result.ornekNo}</td>
                          <td>{formatDate(m.timestamp)}</td>
                          <td>{m.result.agirlik} g</td>
                          <td>{m.result.sicaklik}°C</td>
                          <td>{m.result.okuma} cm³</td>
                          <td style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
                            {m.result.caco3Yuzde.toFixed(2)}%
                          </td>
                          <td>
                            <span className={`badge ${classForSinif(m.result.sinif)}`}>{m.result.sinif}</span>
                          </td>
                          <td>
                            <button
                              className="project-item__delete"
                              style={{ opacity: 1, fontSize: '0.75rem' }}
                              onClick={() => handleDeleteMeasurement(m.id)}
                              title="Ölçümü sil"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* ════════ New Project Modal ════════ */}
      {showNewProject && (
        <div className="modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Yeni Proje Oluştur</h3>
            <div className="form-group">
              <label htmlFor="projectName">Proje Adı</label>
              <input
                id="projectName"
                className="input"
                type="text"
                placeholder="Örn: Tarla A - Nisan 2026"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject();
                }}
              />
            </div>
            <div className="modal__actions">
              <button className="btn btn--secondary" onClick={() => setShowNewProject(false)} style={{ flex: 'none', padding: '0.5rem 1rem' }}>
                İptal
              </button>
              <button
                className="btn btn--primary"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                style={{ flex: 'none', padding: '0.5rem 1rem' }}
                id="btn-create-project"
              >
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
