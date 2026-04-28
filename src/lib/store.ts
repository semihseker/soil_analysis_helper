import type { CalcimeterResult } from './calcimeter';

/* ─── Types ─── */
export interface MeasurementEntry {
  id: string;
  result: CalcimeterResult;
  timestamp: string; // ISO string
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  measurements: MeasurementEntry[];
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
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
    if (raw) return JSON.parse(raw) as AppState;
  } catch { /* ignore */ }
  return { projects: [], activeProjectId: null };
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ─── Project Operations ─── */
export function createProject(state: AppState, name: string): AppState {
  const project: Project = {
    id: genId(),
    name,
    createdAt: new Date().toISOString(),
    measurements: [],
  };
  return {
    projects: [...state.projects, project],
    activeProjectId: project.id,
  };
}

export function deleteProject(state: AppState, projectId: string): AppState {
  const projects = state.projects.filter((p) => p.id !== projectId);
  const activeProjectId =
    state.activeProjectId === projectId
      ? (projects.length > 0 ? projects[0].id : null)
      : state.activeProjectId;
  return { projects, activeProjectId };
}

export function addMeasurement(state: AppState, projectId: string, result: CalcimeterResult): AppState {
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

/* ─── CSV Export ─── */
export function exportProjectCSV(project: Project): string {
  const headers = [
    'Örnek No',
    'Tarih',
    'Ağırlık (g)',
    'Sıcaklık (°C)',
    'Basınç (mmHg)',
    'Okuma (cm³)',
    'Buhar Basıncı (mmHg)',
    'Düzeltilmiş Hacim (cm³)',
    '% CaCO3',
    'Sınıf',
  ];

  const rows = project.measurements.map((m) => {
    const r = m.result;
    const date = new Date(m.timestamp);
    const dateStr = date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return [
      r.ornekNo,
      dateStr,
      r.agirlik,
      r.sicaklik,
      r.basincMmHg.toFixed(1),
      r.okuma,
      r.buharBasinci.toFixed(4),
      r.duzeltilmisHacim.toFixed(4),
      r.caco3Yuzde.toFixed(2),
      r.sinif,
    ].join(';');
  });

  return [headers.join(';'), ...rows].join('\n');
}

export function downloadCSV(csv: string, filename: string): void {
  // BOM for Excel Turkish character support
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Active Project Helper ─── */
export function getActiveProject(state: AppState): Project | null {
  if (!state.activeProjectId) return null;
  return state.projects.find((p) => p.id === state.activeProjectId) ?? null;
}
