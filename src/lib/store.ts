import type { CalcimeterResult } from './calcimeter';
import type { TextureResult } from './soil-texture';
import type { TuzResult } from './tuz';
import * as XLSX from 'xlsx';

/* ─── Types ─── */
export interface SoilSample {
  id: string;
  ornekNo: string;
  timestamp: string; // ISO string
  calcimeterResult?: CalcimeterResult;
  textureResult?: TextureResult;
  tuzResult?: TuzResult;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  samples: SoilSample[];
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
    if (raw) {
      const parsed = JSON.parse(raw) as any;
      
      const projects: Project[] = (parsed.projects || []).map((p: any) => {
        // Zaten yeni formattaysa aynen döndür
        if (p.samples) return p;

        // Eski formattaysa dönüştür
        const samples: SoilSample[] = (p.measurements || []).map((m: any) => {
          const sample: SoilSample = {
            id: m.id || genId(),
            ornekNo: m.result?.ornekNo || 'Bilinmiyor',
            timestamp: m.timestamp || new Date().toISOString(),
          };
          if (p.type === 'kirec') sample.calcimeterResult = m.result;
          else if (p.type === 'tekstur') sample.textureResult = m.result;
          else if (p.type === 'tuz') sample.tuzResult = m.result;
          return sample;
        });

        const typeName = p.type === 'kirec' ? 'Kireç' : p.type === 'tekstur' ? 'Tekstür' : p.type === 'tuz' ? 'Tuz' : 'Eski';
        return {
          id: p.id,
          name: `${p.name} (${typeName})`,
          createdAt: p.createdAt || new Date().toISOString(),
          samples,
        };
      });

      // Eski active project id'leri birleştir (herhangi biri aktifse onu al)
      const activeProjectId = parsed.activeProjectId || parsed.activeTextureProjectId || parsed.activeTuzProjectId || null;

      return {
        projects,
        activeProjectId,
      };
    }
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
    samples: [],
  };
  return {
    ...state,
    projects: [...state.projects, project],
    activeProjectId: project.id,
  };
}

export function deleteProject(state: AppState, projectId: string): AppState {
  const projects = state.projects.filter((p) => p.id !== projectId);
  let { activeProjectId } = state;
  
  if (activeProjectId === projectId) {
    activeProjectId = projects.length > 0 ? projects[0].id : null;
  }

  return { projects, activeProjectId };
}

export type AnalysisType = 'calcimeter' | 'texture' | 'tuz';

export function addOrUpdateSample(state: AppState, projectId: string, type: AnalysisType, result: any): AppState {
  return {
    ...state,
    projects: state.projects.map((p) => {
      if (p.id !== projectId) return p;

      const existingSampleIndex = p.samples.findIndex((s) => s.ornekNo === result.ornekNo);
      
      if (existingSampleIndex >= 0) {
        // Var olan örneği güncelle
        const updatedSamples = [...p.samples];
        const updatedSample = { ...updatedSamples[existingSampleIndex], timestamp: new Date().toISOString() };
        
        if (type === 'calcimeter') updatedSample.calcimeterResult = result;
        else if (type === 'texture') updatedSample.textureResult = result;
        else if (type === 'tuz') updatedSample.tuzResult = result;
        
        updatedSamples[existingSampleIndex] = updatedSample;
        return { ...p, samples: updatedSamples };
      } else {
        // Yeni örnek ekle
        const newSample: SoilSample = {
          id: genId(),
          ornekNo: result.ornekNo,
          timestamp: new Date().toISOString(),
        };
        if (type === 'calcimeter') newSample.calcimeterResult = result;
        else if (type === 'texture') newSample.textureResult = result;
        else if (type === 'tuz') newSample.tuzResult = result;
        
        return { ...p, samples: [...p.samples, newSample] };
      }
    }),
  };
}

export function deleteSample(state: AppState, projectId: string, sampleId: string): AppState {
  return {
    ...state,
    projects: state.projects.map((p) =>
      p.id === projectId
        ? { ...p, samples: p.samples.filter((s) => s.id !== sampleId) }
        : p
    ),
  };
}

/* ─── Active Project Helper ─── */
export function getActiveProject(state: AppState): Project | null {
  if (!state.activeProjectId) return null;
  return state.projects.find((p) => p.id === state.activeProjectId) ?? null;
}

export function setActiveProject(state: AppState, projectId: string): AppState {
  return { ...state, activeProjectId: projectId };
}

/* ─── CSV Export ─── */
export function exportProjectCSV(project: Project): string {
  const headers = [
    'Örnek No', 'Son Güncelleme', 
    // Kireç
    'Ağırlık (g)', 'Kireç Sıcaklık (°C)', 'Basınç (mmHg)', 'Okuma (cm³)', 'Buhar Bas. (mmHg)', 'Düzeltilmiş Hacim (cm³)', '% CaCO3', 'Kireç Sınıfı',
    // Tekstür
    'Kum (%)', 'Silt (%)', 'Kil (%)', 'Tekstür Sınıfı (TR)', 'Tekstür Sınıfı (EN)',
    // Tuz
    'Tuz Sıcaklık (°C)', 'Saturasyon (cm³)', 'Direnç (Ohm)', '% Toplam Tuz', 'Tuz Sınıfı (%)', 'ECe (dS/m)', 'Tuz Sınıfı (ECe)', 'Uygun Bitkiler'
  ];

  const rows = project.samples.map((s) => {
    const dateStr = new Date(s.timestamp).toLocaleString('tr-TR');
    
    // Kireç
    const cr = s.calcimeterResult;
    const calcData = cr ? [
      cr.agirlik, cr.sicaklik, cr.basincMmHg.toFixed(1), cr.okuma, 
      cr.buharBasinci.toFixed(4), cr.duzeltilmisHacim.toFixed(4), 
      cr.caco3Yuzde.toFixed(2), cr.sinif
    ] : ['', '', '', '', '', '', '', ''];

    // Tekstür
    const tr = s.textureResult;
    const texData = tr ? [
      tr.sand.toFixed(2), tr.silt.toFixed(2), tr.clay.toFixed(2),
      tr.textureClassTR, tr.textureClass
    ] : ['', '', '', '', ''];

    // Tuz
    const tz = s.tuzResult;
    const tuzData = tz ? [
      tz.temperature, tz.saturation, tz.resistance,
      tz.saltPct.toFixed(2), tz.saltClassPct, tz.ece.toFixed(1), tz.saltClassEce, tz.suitableCrops
    ] : ['', '', '', '', '', '', '', ''];

    return [s.ornekNo, dateStr, ...calcData, ...texData, ...tuzData].join(';');
  });

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
  const data = project.samples.map((s) => {
    const cr = s.calcimeterResult;
    const tr = s.textureResult;
    const tz = s.tuzResult;

    return {
      'Örnek No': s.ornekNo,
      'Son Güncelleme': new Date(s.timestamp).toLocaleString('tr-TR'),
      
      // Kireç
      'Ağırlık (g)': cr?.agirlik ?? '',
      'Kireç Sıcaklık (°C)': cr?.sicaklik ?? '',
      'Basınç (mmHg)': cr ? Number(cr.basincMmHg.toFixed(1)) : '',
      'Okuma (cm³)': cr?.okuma ?? '',
      'Buhar Bas. (mmHg)': cr ? Number(cr.buharBasinci.toFixed(4)) : '',
      'Düz. Hacim (cm³)': cr ? Number(cr.duzeltilmisHacim.toFixed(4)) : '',
      '% CaCO3': cr ? Number(cr.caco3Yuzde.toFixed(2)) : '',
      'Kireç Sınıfı': cr?.sinif ?? '',

      // Tekstür
      'Kum (%)': tr ? Number(tr.sand.toFixed(2)) : '',
      'Silt (%)': tr ? Number(tr.silt.toFixed(2)) : '',
      'Kil (%)': tr ? Number(tr.clay.toFixed(2)) : '',
      'Tekstür Sınıfı (TR)': tr?.textureClassTR ?? '',
      'Tekstür Sınıfı (EN)': tr?.textureClass ?? '',

      // Tuz
      'Tuz Sıcaklık (°C)': tz?.temperature ?? '',
      'Saturasyon (cm³)': tz?.saturation ?? '',
      'Direnç (Ohm)': tz?.resistance ?? '',
      '% Toplam Tuz': tz ? Number(tz.saltPct.toFixed(2)) : '',
      'Tuz Sınıfı (%)': tz?.saltClassPct ?? '',
      'ECe (dS/m)': tz ? Number(tz.ece.toFixed(1)) : '',
      'Tuz Sınıfı (ECe)': tz?.saltClassEce ?? '',
      'Uygun Bitkiler': tz?.suitableCrops ?? '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tüm Analizler");
  XLSX.writeFile(wb, `${project.name.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_\- ]/g, '')}.xlsx`);
}
