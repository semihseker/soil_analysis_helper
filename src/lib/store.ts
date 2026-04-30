import type { CalcimeterResult } from './calcimeter';
import type { TextureResult } from './soil-texture';
import type { TuzResult } from './tuz';
import * as XLSX from 'xlsx';

/* ─── Types ─── */
export type ProjectType = 'kirec' | 'tekstur' | 'tuz';

export interface MeasurementEntry<T = any> {
  id: string;
  result: T;
  timestamp: string; // ISO string
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  type: ProjectType;
  measurements: MeasurementEntry<any>[];
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null; // For kirec
  activeTextureProjectId: string | null; // For tekstur
  activeTuzProjectId: string | null; // For tuz
}

const STORAGE_KEY = 'calcimeter_app_state';

/* ─── Helpers ─── */
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ─── Load / Save ─── */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as any;
      // Backwards compatibility
      const projects = (parsed.projects || []).map((p: any) => ({
        ...p,
        type: p.type || 'kirec',
      }));
      return {
        projects,
        activeProjectId: parsed.activeProjectId || null,
        activeTextureProjectId: parsed.activeTextureProjectId || null,
        activeTuzProjectId: parsed.activeTuzProjectId || null,
      };
    }
  } catch { /* ignore */ }
  return { projects: [], activeProjectId: null, activeTextureProjectId: null, activeTuzProjectId: null };
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ─── Project Operations ─── */
export function createProject(state: AppState, name: string, type: ProjectType): AppState {
  const project: Project = {
    id: genId(),
    name,
    createdAt: new Date().toISOString(),
    type,
    measurements: [],
  };
  return {
    ...state,
    projects: [...state.projects, project],
    ...(type === 'kirec' ? { activeProjectId: project.id } : type === 'tekstur' ? { activeTextureProjectId: project.id } : { activeTuzProjectId: project.id }),
  };
}

export function deleteProject(state: AppState, projectId: string): AppState {
  const projectToDelete = state.projects.find((p) => p.id === projectId);
  const projects = state.projects.filter((p) => p.id !== projectId);
  
  let { activeProjectId, activeTextureProjectId, activeTuzProjectId } = state;
  
  if (projectToDelete?.type === 'kirec' && activeProjectId === projectId) {
    const remaining = projects.filter(p => p.type === 'kirec');
    activeProjectId = remaining.length > 0 ? remaining[0].id : null;
  } else if (projectToDelete?.type === 'tekstur' && activeTextureProjectId === projectId) {
    const remaining = projects.filter(p => p.type === 'tekstur');
    activeTextureProjectId = remaining.length > 0 ? remaining[0].id : null;
  } else if (projectToDelete?.type === 'tuz' && activeTuzProjectId === projectId) {
    const remaining = projects.filter(p => p.type === 'tuz');
    activeTuzProjectId = remaining.length > 0 ? remaining[0].id : null;
  }

  return { projects, activeProjectId, activeTextureProjectId, activeTuzProjectId };
}

export function addMeasurement(state: AppState, projectId: string, result: any): AppState {
  const entry: MeasurementEntry = {
    id: genId(),
    result,
    timestamp: new Date().toISOString(),
  };
  return {
    ...state,
    projects: state.projects.map((p) =>
      p.id === projectId ? { ...p, measurements: [...p.measurements, entry] } : p
    ),
  };
}

export function deleteMeasurement(state: AppState, projectId: string, measurementId: string): AppState {
  return {
    ...state,
    projects: state.projects.map((p) =>
      p.id === projectId
        ? { ...p, measurements: p.measurements.filter((m) => m.id !== measurementId) }
        : p
    ),
  };
}

/* ─── Active Project Helper ─── */
export function getActiveProject(state: AppState, type: ProjectType): Project | null {
  const activeId = type === 'kirec' ? state.activeProjectId : type === 'tekstur' ? state.activeTextureProjectId : state.activeTuzProjectId;
  if (!activeId) return null;
  return state.projects.find((p) => p.id === activeId) ?? null;
}

export function setActiveProject(state: AppState, projectId: string, type: ProjectType): AppState {
  return {
    ...state,
    ...(type === 'kirec' ? { activeProjectId: projectId } : type === 'tekstur' ? { activeTextureProjectId: projectId } : { activeTuzProjectId: projectId }),
  };
}

/* ─── CSV Export ─── */
export function exportProjectCSV(project: Project): string {
  let headers: string[];
  let rows: string[];

  if (project.type === 'kirec') {
    headers = [
      'Örnek No', 'Tarih', 'Ağırlık (g)', 'Sıcaklık (°C)', 'Basınç (mmHg)',
      'Okuma (cm³)', 'Buhar Basıncı (mmHg)', 'Düzeltilmiş Hacim (cm³)', '% CaCO3', 'Sınıf'
    ];
    rows = project.measurements.map((m) => {
      const r = m.result as CalcimeterResult;
      const dateStr = new Date(m.timestamp).toLocaleString('tr-TR');
      return [
        r.ornekNo, dateStr, r.agirlik, r.sicaklik, r.basincMmHg.toFixed(1),
        r.okuma, r.buharBasinci.toFixed(4), r.duzeltilmisHacim.toFixed(4),
        r.caco3Yuzde.toFixed(2), r.sinif
      ].join(';');
    });
  } else if (project.type === 'tekstur') {
    headers = ['Örnek No', 'Tarih', 'Kum (%)', 'Silt (%)', 'Kil (%)', 'Sınıf (TR)', 'Sınıf (EN)'];
    rows = project.measurements.map((m) => {
      const r = m.result as TextureResult;
      const dateStr = new Date(m.timestamp).toLocaleString('tr-TR');
      return [
        r.ornekNo, dateStr, r.sand.toFixed(2), r.silt.toFixed(2), r.clay.toFixed(2),
        r.textureClassTR, r.textureClass
      ].join(';');
    });
  } else {
    headers = ['Örnek No', 'Tarih', 'Sıcaklık (°C)', 'Saturasyon (cm³)', 'Direnç (Ohm)', '% Toplam Tuz', 'Tuz Sınıfı (%)', 'ECe (dS/m)', 'Tuz Sınıfı (ECe)', 'Uygun Bitkiler'];
    rows = project.measurements.map((m) => {
      const r = m.result as TuzResult;
      const dateStr = new Date(m.timestamp).toLocaleString('tr-TR');
      return [
        r.ornekNo, dateStr, r.temperature, r.saturation, r.resistance,
        r.saltPct.toFixed(2), r.saltClassPct, r.ece.toFixed(1), r.saltClassEce, r.suitableCrops
      ].join(';');
    });
  }

  return [headers.join(';'), ...rows].join('\n');
}

export function downloadCSV(csv: string, filename: string): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Excel (XLSX) Export ─── */
export function exportProjectExcel(project: Project): void {
  let data: any[];

  if (project.type === 'kirec') {
    data = project.measurements.map((m) => {
      const r = m.result as CalcimeterResult;
      return {
        'Örnek No': r.ornekNo,
        'Tarih': new Date(m.timestamp).toLocaleString('tr-TR'),
        'Ağırlık (g)': r.agirlik,
        'Sıcaklık (°C)': r.sicaklik,
        'Basınç (mmHg)': Number(r.basincMmHg.toFixed(1)),
        'Okuma (cm³)': r.okuma,
        'Buhar Basıncı (mmHg)': Number(r.buharBasinci.toFixed(4)),
        'Düzeltilmiş Hacim (cm³)': Number(r.duzeltilmisHacim.toFixed(4)),
        '% CaCO3': Number(r.caco3Yuzde.toFixed(2)),
        'Sınıf': r.sinif,
      };
    });
  } else if (project.type === 'tekstur') {
    data = project.measurements.map((m) => {
      const r = m.result as TextureResult;
      return {
        'Örnek No': r.ornekNo,
        'Tarih': new Date(m.timestamp).toLocaleString('tr-TR'),
        'Kum (%)': Number(r.sand.toFixed(2)),
        'Silt (%)': Number(r.silt.toFixed(2)),
        'Kil (%)': Number(r.clay.toFixed(2)),
        'Sınıf (TR)': r.textureClassTR,
        'Sınıf (EN)': r.textureClass,
      };
    });
  } else {
    data = project.measurements.map((m) => {
      const r = m.result as TuzResult;
      return {
        'Örnek No': r.ornekNo,
        'Tarih': new Date(m.timestamp).toLocaleString('tr-TR'),
        'Sıcaklık (°C)': r.temperature,
        'Saturasyon (cm³)': r.saturation,
        'Direnç (Ohm)': r.resistance,
        '% Toplam Tuz': Number(r.saltPct.toFixed(2)),
        'Tuz Sınıfı (%)': r.saltClassPct,
        'ECe (dS/m)': Number(r.ece.toFixed(1)),
        'Tuz Sınıfı (ECe)': r.saltClassEce,
        'Uygun Bitkiler': r.suitableCrops,
      };
    });
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Analiz Sonucları");
  XLSX.writeFile(wb, `${project.name}.xlsx`);
}
