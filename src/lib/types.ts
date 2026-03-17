export type Position = 'levantador' | 'ponteiro' | 'oposto' | 'central' | 'libero';

export type ModuleType = 'aquecimento' | 'fundamento' | 'tecnico' | 'tatico' | 'jogo' | 'fisico';

export type ModuleStatus = 'concluido' | 'parcial' | 'nao_fez';

export type TrainingStatus = 'planejado' | 'concluido' | 'parcial' | 'cancelado';

export type MeasurementType = 'repeticao' | 'tempo' | 'distancia' | 'pontuacao';

export type EvalRule = 'maior_melhor' | 'menor_melhor';

export type PhysicalAttribute = 'forca' | 'explosao' | 'agilidade' | 'velocidade' | 'resistencia' | 'reflexo';

export type TechnicalAttribute = 'bloqueio' | 'saque' | 'ataque' | 'defesa' | 'recepcao' | 'cobertura' | 'leitura_de_jogo' | 'levantamento';

export const PHYSICAL_ATTRIBUTES: PhysicalAttribute[] = ['forca', 'explosao', 'agilidade', 'velocidade', 'resistencia', 'reflexo'];

export const TECHNICAL_ATTRIBUTES: TechnicalAttribute[] = ['bloqueio', 'saque', 'ataque', 'defesa', 'recepcao', 'cobertura', 'leitura_de_jogo', 'levantamento'];

export const PHYSICAL_ATTRIBUTE_LABELS: Record<PhysicalAttribute, string> = {
  forca: 'Força',
  explosao: 'Explosão',
  agilidade: 'Agilidade',
  velocidade: 'Velocidade',
  resistencia: 'Resistência',
  reflexo: 'Reflexo',
};

export const TECHNICAL_ATTRIBUTE_LABELS: Record<TechnicalAttribute, string> = {
  bloqueio: 'Bloqueio',
  saque: 'Saque',
  ataque: 'Ataque',
  defesa: 'Defesa',
  recepcao: 'Recepção',
  cobertura: 'Cobertura',
  leitura_de_jogo: 'Leitura de Jogo',
  levantamento: 'Levantamento',
};

export const MEASUREMENT_TYPE_LABELS: Record<MeasurementType, string> = {
  repeticao: 'Repetição',
  tempo: 'Tempo',
  distancia: 'Distância',
  pontuacao: 'Pontuação',
};

export interface EvalTest {
  id: string;
  attribute: PhysicalAttribute | TechnicalAttribute;
  category: 'physical' | 'technical';
  name: string;
  measurementType: MeasurementType;
  maxValue: number;
  rule: EvalRule;
}

export interface EvalResult {
  id: string;
  athleteId: string;
  testId: string;
  rawValue: number;
  convertedScore: number; // 0-100
  date: string; // ISO date
}

export interface Athlete {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: Position;
  height: string;
  age: number;
  photo?: string;
  observation: string;
}

export type BlockType = 'geral' | 'posicao';

export interface TrainingModule {
  id: string;
  type: ModuleType;
  blockType: BlockType;
  description: string;
  duration: number;
  status: ModuleStatus;
  observation: string;
  skillObservation?: string;
  skills?: string[];
  positions?: Position[];
}

export interface Training {
  id: string;
  teamId: string;
  name: string;
  date: string;
  duration: number;
  modules: TrainingModule[];
  status: TrainingStatus;
}

export interface Microcycle {
  id: string;
  mesocycleId: string;
  name: string;
  startDate: string;
  endDate: string;
  weeks: number;
}

export interface Mesocycle {
  id: string;
  macrocycleId: string;
  name: string;
  startDate: string;
  endDate: string;
  weeks: number;
}

export interface Macrocycle {
  id: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate: string;
  type: '6months' | '1year';
}

export interface Team {
  id: string;
  name: string;
  photo?: string;
}

export type SuggestionType = 'module_status' | 'module_observation' | 'module_add' | 'module_edit' | 'full_training' | 'general';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface TrainingSuggestion {
  id: string;
  teamId: string;
  trainingId: string;
  trainingName: string;
  auxiliaryName: string;
  type: SuggestionType;
  description: string;
  proposedChange?: {
    moduleId?: string;
    editedModule?: Partial<TrainingModule>;
    newModule?: TrainingModule;
    newTraining?: Omit<Training, 'id'>;
  };
  status: SuggestionStatus;
  createdAt: string;
}

export interface AppData {
  teams: Team[];
  athletes: Athlete[];
  trainings: Training[];
  macrocycles: Macrocycle[];
  mesocycles: Mesocycle[];
  microcycles: Microcycle[];
  evalTests: EvalTest[];
  evalResults: EvalResult[];
  activeTeamId: string;
  trainingSuggestions: TrainingSuggestion[];
}

export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  aquecimento: 'Aquecimento',
  fundamento: 'Fundamento',
  tecnico: 'Técnico',
  tatico: 'Tático',
  jogo: 'Jogo',
  fisico: 'Físico',
};

export const POSITION_LABELS: Record<Position, string> = {
  levantador: 'Levantador',
  ponteiro: 'Ponteiro',
  oposto: 'Oposto',
  central: 'Central',
  libero: 'Líbero',
};

export const STATUS_LABELS: Record<TrainingStatus, string> = {
  planejado: 'Planejado',
  concluido: 'Concluído',
  parcial: 'Parcial',
  cancelado: 'Cancelado',
};

export const SKILLS = {
  fundamento: ['Manchete', 'Toque', 'Movimento de Ataque', 'Movimento de Bloqueio'],
  ataque: ['Ataque', 'Cobertura', 'Recepção'],
  defesa: ['Bloqueio', 'Defesa'],
} as const;

// Helper: convert raw value to 0-100 score
export function convertToScore(rawValue: number, maxValue: number, rule: EvalRule): number {
  if (maxValue <= 0 || rawValue <= 0) return 0;
  let score: number;
  if (rule === 'maior_melhor') {
    score = (rawValue / maxValue) * 100;
  } else {
    score = (maxValue / rawValue) * 100;
  }
  return Math.min(Math.round(score * 10) / 10, 100);
}

// Helper: calculate athlete level (1-20) from attribute averages
export function calculateAthleteLevel(
  athleteId: string,
  evalTests: EvalTest[],
  evalResults: EvalResult[]
): number {
  const athleteResults = evalResults.filter(r => r.athleteId === athleteId);
  if (athleteResults.length === 0) return 0;

  const allAttrs = [...PHYSICAL_ATTRIBUTES, ...TECHNICAL_ATTRIBUTES] as string[];
  const attrScores: number[] = [];

  for (const attr of allAttrs) {
    const testsForAttr = evalTests.filter(t => t.attribute === attr);
    if (testsForAttr.length === 0) continue;

    const testScores: number[] = [];
    for (const test of testsForAttr) {
      const results = athleteResults.filter(r => r.testId === test.id);
      if (results.length > 0) {
        const latest = results.sort((a, b) => b.date.localeCompare(a.date))[0];
        testScores.push(latest.convertedScore);
      }
    }
    if (testScores.length > 0) {
      attrScores.push(testScores.reduce((s, v) => s + v, 0) / testScores.length);
    }
  }

  if (attrScores.length === 0) return 0;
  const avg = attrScores.reduce((s, v) => s + v, 0) / attrScores.length;
  return Math.round((avg / 5) * 10) / 10;
}

// Helper: get attribute score for an athlete (average of all test results for that attribute)
export function getAthleteAttributeScore(
  athleteId: string,
  attribute: string,
  evalTests: EvalTest[],
  evalResults: EvalResult[]
): number {
  const testsForAttr = evalTests.filter(t => t.attribute === attribute);
  if (testsForAttr.length === 0) return 0;

  const athleteResults = evalResults.filter(r => r.athleteId === athleteId);
  const testScores: number[] = [];

  for (const test of testsForAttr) {
    const results = athleteResults.filter(r => r.testId === test.id);
    if (results.length > 0) {
      const latest = results.sort((a, b) => b.date.localeCompare(a.date))[0];
      testScores.push(latest.convertedScore);
    }
  }

  if (testScores.length === 0) return 0;
  return Math.round((testScores.reduce((s, v) => s + v, 0) / testScores.length) * 10) / 10;
}

// Helper: get the last evaluation date for an athlete's attribute
export function getAthleteAttributeLastDate(
  athleteId: string,
  attribute: string,
  evalTests: EvalTest[],
  evalResults: EvalResult[]
): string | null {
  const testsForAttr = evalTests.filter(t => t.attribute === attribute);
  if (testsForAttr.length === 0) return null;

  const athleteResults = evalResults.filter(r => r.athleteId === athleteId);
  let latestDate: string | null = null;

  for (const test of testsForAttr) {
    const results = athleteResults.filter(r => r.testId === test.id);
    if (results.length > 0) {
      const sorted = results.sort((a, b) => b.date.localeCompare(a.date));
      if (!latestDate || sorted[0].date > latestDate) {
        latestDate = sorted[0].date;
      }
    }
  }

  return latestDate;
}
