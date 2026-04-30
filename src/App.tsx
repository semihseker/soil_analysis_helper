import { useState, useCallback, useEffect } from 'react';
import {
  loadState,
  saveState,
  createProject,
  deleteProject,
  deleteSample,
  addOrUpdateSample,
  getActiveProject,
  setActiveProject,
  exportProjectCSV,
  exportProjectExcel,
  downloadCSV,
  type AppState,
} from './lib/store';
import { exportProjectPDF } from './lib/pdf-export';
import CalcimeterPage from './CalcimeterPage';
import TexturePage from './TexturePage';
import TuzPage from './TuzPage';
import './index.css';

type TabId = 'master' | 'calcimeter' | 'texture' | 'tuz';

export default function App() {
  /* ─── App State ─── */
  const [state, setState] = useState<AppState>(() => loadState());
  const [activeTab, setActiveTab] = useState<TabId>('master');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedOrnekNo, setSelectedOrnekNo] = useState<string>('');

  // Persist
  useEffect(() => { saveState(state); }, [state]);

  const activeProject = getActiveProject(state);

  /* ─── Project Handlers ─── */
  const handleCreateProject = useCallback(() => {
    const name = newProjectName.trim();
    if (!name) return;
    setState((s) => createProject(s, name));
    setNewProjectName('');
    setShowNewProject(false);
    setActiveTab('master');
    setSelectedOrnekNo('');
  }, [newProjectName]);

  const handleDeleteProject = useCallback((id: string) => {
    setState((s) => deleteProject(s, id));
    setDeleteConfirmId(null);
  }, []);

  const handleSelectProject = useCallback((id: string) => {
    setState((s) => setActiveProject(s, id));
    setActiveTab('master');
    setSelectedOrnekNo('');
  }, []);

  const handleDeleteSample = useCallback((sampleId: string) => {
    if (!activeProject) return;
    if (confirm('Bu örneği ve tüm analiz sonuçlarını silmek istediğinize emin misiniz?')) {
      setState((s) => deleteSample(s, activeProject.id, sampleId));
    }
  }, [activeProject]);

  const handleExportCSV = useCallback(() => {
    if (!activeProject || activeProject.samples.length === 0) return;
    const csv = exportProjectCSV(activeProject);
    const safeName = activeProject.name.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_\- ]/g, '').replace(/\s+/g, '_');
    downloadCSV(csv, `${safeName}_Tum_Analizler.csv`);
  }, [activeProject]);

  const handleExportPDF = useCallback(async () => {
    if (!activeProject || activeProject.samples.length === 0) return;
    await exportProjectPDF(activeProject);
  }, [activeProject]);

  const handleExportExcel = useCallback(() => {
    if (!activeProject || activeProject.samples.length === 0) return;
    exportProjectExcel(activeProject);
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
              <div className="sidebar__brand-lab">Analiz Laboratuvarı</div>
            </div>
          </div>
        </div>

        <div className="sidebar__new-project" style={{ padding: '1rem' }}>
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
              className={`project-item ${state.activeProjectId === p.id ? 'project-item--active' : ''}`}
              onClick={() => handleSelectProject(p.id)}
            >
              <span className="project-item__icon">📁</span>
              <span className="project-item__name">{p.name}</span>
              <span className="project-item__count">{p.samples.length}</span>
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
              Başlamak için bir proje oluşturun veya seçin
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
              Sol panelden "Yeni Proje" butonuna tıklayın.
            </div>
          </div>
        ) : (
          <>
            {/* ── Title ── */}
            <div className="main__title-row" style={{ paddingBottom: 0 }}>
              <h1 className="main__title">
                {activeProject.name}
                <span className="main__title-badge">
                  {activeProject.samples.length} örnek
                </span>
              </h1>
              {activeProject.samples.length > 0 && (
                <div className="export-btns">
                  <button className="btn btn--green-sm" onClick={handleExportExcel} id="btn-export-excel">
                    📊 Excel
                  </button>
                  <button className="btn btn--green-sm" onClick={handleExportCSV} id="btn-export-csv">
                    📥 CSV
                  </button>
                  <button className="btn btn--red-sm" onClick={handleExportPDF} id="btn-export-pdf">
                    📄 PDF Rapor
                  </button>
                </div>
              )}
            </div>

            {/* ── Inner Tabs ── */}
            <div className="project-tabs">
              <button 
                className={`project-tab ${activeTab === 'master' ? 'project-tab--active' : ''}`}
                onClick={() => setActiveTab('master')}
              >
                📊 Genel Tablo
              </button>
              <button 
                className={`project-tab ${activeTab === 'calcimeter' ? 'project-tab--active' : ''}`}
                onClick={() => setActiveTab('calcimeter')}
              >
                ⚗️ Kireç Ekle
              </button>
              <button 
                className={`project-tab ${activeTab === 'texture' ? 'project-tab--active' : ''}`}
                onClick={() => setActiveTab('texture')}
              >
                📐 Tekstür Ekle
              </button>
              <button 
                className={`project-tab ${activeTab === 'tuz' ? 'project-tab--active' : ''}`}
                onClick={() => setActiveTab('tuz')}
              >
                🧪 Tuz/ECe Ekle
              </button>
            </div>

            {/* ── Content ── */}
            <div style={{ paddingTop: '1.5rem' }}>
              {activeTab === 'master' && (
                <section className="card">
                  <div className="card__header">
                    <div className="card__header-left">
                      <span className="card__header-icon">📋</span>
                      <h2 className="card__header-title">Örnekler ve Analiz Sonuçları</h2>
                    </div>
                  </div>
                  {activeProject.samples.length === 0 ? (
                    <div className="history-empty">
                      <span className="history-empty__icon">🔬</span>
                      Bu projede henüz örnek yok. Yeni ölçüm eklemek için yukarıdaki sekmeleri kullanın.
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table className="history-table master-table">
                        <thead>
                          <tr>
                            <th>Örnek No</th>
                            <th>% CaCO₃</th>
                            <th>Kireç Sınıfı</th>
                            <th>Kum-Silt-Kil (%)</th>
                            <th>Tekstür Sınıfı</th>
                            <th>% Toplam Tuz</th>
                            <th>ECe (dS/m)</th>
                            <th>Tuz Sınıfı (ECe)</th>
                            <th>İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeProject.samples.map((s) => (
                            <tr key={s.id}>
                              <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.ornekNo}</td>
                              
                              {/* Kireç */}
                              <td>{s.calcimeterResult ? `%${s.calcimeterResult.caco3Yuzde.toFixed(2)}` : '-'}</td>
                              <td>{s.calcimeterResult ? <span className="badge class--orta">{s.calcimeterResult.sinif}</span> : '-'}</td>
                              
                              {/* Tekstür */}
                              <td style={{ fontSize: '0.85rem' }}>
                                {s.textureResult ? `${s.textureResult.sand.toFixed(0)} - ${s.textureResult.silt.toFixed(0)} - ${s.textureResult.clay.toFixed(0)}` : '-'}
                              </td>
                              <td>{s.textureResult ? <span className="badge class--kirecli">{s.textureResult.textureClassTR}</span> : '-'}</td>
                              
                              {/* Tuz */}
                              <td>{s.tuzResult ? `%${s.tuzResult.saltPct.toFixed(2)}` : '-'}</td>
                              <td style={{ color: 'var(--red-600)', fontWeight: 500 }}>{s.tuzResult ? s.tuzResult.ece.toFixed(1) : '-'}</td>
                              <td>{s.tuzResult ? <span className="badge class--cok">{s.tuzResult.saltClassEce}</span> : '-'}</td>
                              
                              <td>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    onClick={() => { setSelectedOrnekNo(s.ornekNo); setActiveTab('calcimeter'); }}
                                    title="Analiz Ekle/Güncelle"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                                  >✏️</button>
                                  <button
                                    onClick={() => handleDeleteSample(s.id)}
                                    title="Örneği Tamamen Sil"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-500)' }}
                                  >✕</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'calcimeter' && (
                <CalcimeterPage 
                  defaultOrnekNo={selectedOrnekNo}
                  onSave={(r) => {
                    setState(s => addOrUpdateSample(s, activeProject.id, 'calcimeter', r));
                    setSelectedOrnekNo(r.ornekNo);
                  }}
                />
              )}

              {activeTab === 'texture' && (
                <TexturePage 
                  defaultOrnekNo={selectedOrnekNo}
                  onSave={(r) => {
                    setState(s => addOrUpdateSample(s, activeProject.id, 'texture', r));
                    setSelectedOrnekNo(r.ornekNo);
                  }}
                />
              )}

              {activeTab === 'tuz' && (
                <TuzPage 
                  defaultOrnekNo={selectedOrnekNo}
                  onSave={(r) => {
                    setState(s => addOrUpdateSample(s, activeProject.id, 'tuz', r));
                    setSelectedOrnekNo(r.ornekNo);
                  }}
                />
              )}
            </div>
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
