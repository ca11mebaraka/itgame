import type { Difficulty, OptionKind, Resources } from './state';

export const STARTING_RESOURCES: Resources = {
  clientTrust: 100,
  peerTrust: 100,
  techDebt: 0,
  team: 100,
  budget: 100,
};

export const DEFENSE_MAX_LEVEL = 3;

// Каждый уровень профильной защиты снижает урон угрозы.
export const MITIGATION_PER_LEVEL = 0.25;
export const MITIGATION_CAP = 0.85;

// Доля базового урона угрозы, которую вариант «пропускает» как остаточный.
// Действие по процессу почти не оставляет остатка, «забить» — берёт всё.
export const RESIDUAL_BY_KIND: Record<OptionKind, number> = {
  invest: 0.25,
  process: 0.3,
  hack: 0.0, // мгновенно чисто, но прилетит отложенно
  ignore: 1.0,
};

// Порог победы: доля отражённых угроз.
export const WIN_DEFENDED_RATIO = 0.85;

export const TECH_DEBT_LOSS = 100; // технический долг похоронил продукт

export interface DifficultyProfile {
  totalTurns: number;
  threatDamageMul: number; // множитель урона угроз
  costMul: number; // множитель стоимости вариантов (бюджет/команда)
  winRatio: number; // требуемая доля отражённых угроз
  showAdvisor: boolean; // подсказывать рекомендуемый вариант
  forgiveFirstCritical: boolean; // «вторая жизнь» (на будущее, §14)
}

export const DIFFICULTY: Record<Difficulty, DifficultyProfile> = {
  casual: {
    totalTurns: 12,
    threatDamageMul: 0.8,
    costMul: 0.85,
    winRatio: 0.7,
    showAdvisor: true,
    forgiveFirstCritical: true,
  },
  normal: {
    totalTurns: 14,
    threatDamageMul: 1,
    costMul: 1,
    winRatio: WIN_DEFENDED_RATIO,
    showAdvisor: false,
    forgiveFirstCritical: false,
  },
  hardcore: {
    totalTurns: 16,
    threatDamageMul: 1.25,
    costMul: 1.1,
    winRatio: 0.9,
    showAdvisor: false,
    forgiveFirstCritical: false,
  },
};

// Расписание событий партии. Длина обрезается/дополняется под totalTurns профиля.
export const BASE_SCHEDULE: { kind: 'threat' | 'random'; tier?: 'common' | 'rare' | 'boss' }[] = [
  { kind: 'threat', tier: 'common' },
  { kind: 'threat', tier: 'common' },
  { kind: 'random' },
  { kind: 'threat', tier: 'common' },
  { kind: 'threat', tier: 'rare' },
  { kind: 'threat', tier: 'common' },
  { kind: 'random' },
  { kind: 'threat', tier: 'boss' },
  { kind: 'threat', tier: 'common' },
  { kind: 'threat', tier: 'rare' },
  { kind: 'threat', tier: 'common' },
  { kind: 'random' },
  { kind: 'threat', tier: 'rare' },
  { kind: 'threat', tier: 'boss' },
  { kind: 'threat', tier: 'common' },
  { kind: 'threat', tier: 'boss' },
];
