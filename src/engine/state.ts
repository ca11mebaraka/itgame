// Типы игрового состояния и контента. Без логики и без DOM.

export interface Resources {
  clientTrust: number; // Доверие клиентов
  peerTrust: number; // Доверие коллег
  techDebt: number; // Технический долг (выше = хуже)
  team: number; // Команда (доступность людей)
  budget: number; // Бюджет
}

export type ResourceDelta = Partial<Resources>;

export const DEFENSE_KEYS = [
  'codeReview',
  'riskAssessment',
  'qa',
  'postReleaseAcceptance',
  'monitoring',
  'backup',
  'incidentResponse',
  'changeManagement',
] as const;

export type DefenseKey = (typeof DEFENSE_KEYS)[number];
export type Defenses = Record<DefenseKey, number>;

export const DEFENSE_LABELS: Record<DefenseKey, string> = {
  codeReview: 'Code Review',
  riskAssessment: 'Risk Assessment',
  qa: 'QA',
  postReleaseAcceptance: 'Post Release Acceptance',
  monitoring: 'Monitoring',
  backup: 'Backup',
  incidentResponse: 'Incident Response Team',
  changeManagement: 'Change Management',
};

// process — действовать по процессу; invest — вложиться в развитие процесса;
// hack — быстрый костыль (хорошо сейчас, плохо потом); ignore — забить.
export type OptionKind = 'process' | 'invest' | 'hack' | 'ignore';

export interface DelayedEffect {
  afterTurns: number;
  text: string;
  impact: ResourceDelta;
}

export interface ChoiceOption {
  text: string;
  kind: OptionKind;
  immediate?: ResourceDelta;
  defenseUpgrade?: DefenseKey;
  delayed?: DelayedEffect[];
  resolvesThreat: boolean; // считается ли угроза отражённой
  feedback: string; // последствие выбора
  recommended?: boolean; // для «советника» в casual-режиме
}

export type ThreatTier = 'common' | 'rare' | 'boss';

export interface Threat {
  id: string;
  title: string;
  tier: ThreatTier;
  intro: string;
  defendedBy: DefenseKey[];
  baseImpact: ResourceDelta; // урон при провале (масштабируется защитами)
  options: ChoiceOption[];
}

export interface RandomEvent {
  id: string;
  text: string;
  impact?: ResourceDelta;
}

export type EventKind = 'threat' | 'random';

export interface ScheduledSlot {
  kind: EventKind;
  tier?: ThreatTier;
}

export interface PendingDelayed {
  dueTurn: number;
  effect: DelayedEffect;
}

export interface CurrentEvent {
  kind: EventKind;
  threat?: Threat;
  random?: RandomEvent;
  delayedBanners: string[]; // тексты сработавших на этом ходу отложенных эффектов
}

export interface TurnRecord {
  turn: number;
  kind: EventKind;
  threatId?: string;
  threatTitle?: string;
  tier?: ThreatTier;
  defendedBy?: DefenseKey[];
  optionText?: string;
  optionKind?: OptionKind;
  defended?: boolean;
  delta: ResourceDelta;
}

export type Difficulty = 'casual' | 'normal' | 'hardcore';
export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  turn: number; // 1-based индекс текущего хода
  totalTurns: number;
  difficulty: Difficulty;
  resources: Resources;
  defenses: Defenses;
  schedule: ScheduledSlot[];
  pendingDelayed: PendingDelayed[];
  current: CurrentEvent | null;
  threatsTotal: number;
  threatsFaced: number;
  threatsDefended: number;
  usedThreatIds: string[];
  log: TurnRecord[];
  status: GameStatus;
  lossReason?: string;
  seed: number;
  startedAt: number;
}
