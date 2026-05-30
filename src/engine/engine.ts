import {
  DEFENSE_KEYS,
  type ChoiceOption,
  type Defenses,
  type Difficulty,
  type GameState,
  type RandomEvent,
  type ResourceDelta,
  type Resources,
  type ScheduledSlot,
  type Threat,
  type ThreatTier,
  type TurnRecord,
} from './state';
import {
  BASE_SCHEDULE,
  DEFENSE_MAX_LEVEL,
  DIFFICULTY,
  MITIGATION_CAP,
  MITIGATION_PER_LEVEL,
  RESIDUAL_BY_KIND,
  STARTING_RESOURCES,
  TECH_DEBT_LOSS,
} from './balance';
import { createRng, randomSeed, sampleUnique, type Rng } from './rng';
import { COMMON_THREATS, RARE_THREATS, BOSS_THREATS } from '../content/threats';
import { RANDOM_EVENTS } from '../content/random-events';

const THREAT_POOLS: Record<ThreatTier, readonly Threat[]> = {
  common: COMMON_THREATS,
  rare: RARE_THREATS,
  boss: BOSS_THREATS,
};

function emptyDefenses(): Defenses {
  return Object.fromEntries(DEFENSE_KEYS.map((k) => [k, 0])) as Defenses;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function addDelta(res: Resources, delta: ResourceDelta): void {
  for (const key of Object.keys(delta) as (keyof Resources)[]) {
    res[key] += delta[key] ?? 0;
  }
}

function scaleDelta(delta: ResourceDelta, factor: number): ResourceDelta {
  const out: ResourceDelta = {};
  for (const key of Object.keys(delta) as (keyof Resources)[]) {
    out[key] = Math.round((delta[key] ?? 0) * factor);
  }
  return out;
}

function mergeDelta(into: ResourceDelta, from: ResourceDelta): void {
  for (const key of Object.keys(from) as (keyof Resources)[]) {
    into[key] = (into[key] ?? 0) + (from[key] ?? 0);
  }
}

// Снижение урона профильными защитами угрозы.
function mitigation(defenses: Defenses, threat: Threat): number {
  const levels = threat.defendedBy.reduce((sum, key) => sum + defenses[key], 0);
  return Math.min(MITIGATION_CAP, levels * MITIGATION_PER_LEVEL);
}

export interface StartOptions {
  difficulty?: Difficulty;
  seed?: number;
}

export function startGame(options: StartOptions = {}): GameState {
  const difficulty = options.difficulty ?? 'normal';
  const seed = options.seed ?? randomSeed();
  const profile = DIFFICULTY[difficulty];
  const rng = createRng(seed);

  const schedule: ScheduledSlot[] = BASE_SCHEDULE.slice(0, profile.totalTurns).map((s) => ({
    kind: s.kind,
    tier: s.tier,
  }));
  const threatsTotal = schedule.filter((s) => s.kind === 'threat').length;

  const state: GameState = {
    turn: 0,
    totalTurns: profile.totalTurns,
    difficulty,
    resources: { ...STARTING_RESOURCES },
    defenses: emptyDefenses(),
    schedule,
    pendingDelayed: [],
    current: null,
    threatsTotal,
    threatsFaced: 0,
    threatsDefended: 0,
    usedThreatIds: [],
    log: [],
    status: 'playing',
    seed,
    startedAt: Date.now(),
  };

  advance(state, rng);
  return state;
}

// Выбрать контент для следующего слота расписания и применить отложенные эффекты.
function advance(state: GameState, rng: Rng): void {
  state.turn += 1;
  if (state.turn > state.totalTurns) {
    finish(state);
    return;
  }

  // 1. Применяем отложенные эффекты, срок которых наступил.
  const banners: string[] = [];
  const due = state.pendingDelayed.filter((p) => p.dueTurn <= state.turn);
  state.pendingDelayed = state.pendingDelayed.filter((p) => p.dueTurn > state.turn);
  for (const p of due) {
    addDelta(state.resources, p.effect.impact);
    banners.push(p.effect.text);
  }
  normalize(state.resources);

  // Скрытый риск мог утопить ресурсы ещё до показа события.
  if (checkLoss(state)) {
    state.current = { kind: 'random', delayedBanners: banners };
    return;
  }

  // 2. Выбираем событие слота.
  const slot = state.schedule[state.turn - 1];
  if (slot.kind === 'random') {
    state.current = {
      kind: 'random',
      random: pickRandomEvent(state, rng),
      delayedBanners: banners,
    };
    return;
  }

  const threat = pickThreat(state, rng, slot.tier ?? 'common');
  state.current = { kind: 'threat', threat, delayedBanners: banners };
}

function pickThreat(state: GameState, rng: Rng, tier: ThreatTier): Threat {
  const pool = THREAT_POOLS[tier].filter((t) => !state.usedThreatIds.includes(t.id));
  const chosen = (pool.length > 0 ? sampleUnique(rng, pool, 1)[0] : sampleUnique(rng, THREAT_POOLS[tier], 1)[0]);
  state.usedThreatIds.push(chosen.id);
  return chosen;
}

function pickRandomEvent(state: GameState, rng: Rng): RandomEvent {
  const pool = RANDOM_EVENTS.filter((e) => !state.usedThreatIds.includes(e.id));
  const chosen = (pool.length > 0 ? sampleUnique(rng, pool, 1)[0] : sampleUnique(rng, RANDOM_EVENTS, 1)[0]);
  state.usedThreatIds.push(chosen.id);
  return chosen;
}

export function currentOptions(state: GameState): ChoiceOption[] {
  const ev = state.current;
  if (!ev) return [];
  if (ev.kind === 'threat' && ev.threat) return ev.threat.options;
  // Случайное событие: единственная кнопка «Дальше».
  return [
    {
      text: 'Дальше →',
      kind: 'process',
      immediate: ev.random?.impact,
      resolvesThreat: false,
      feedback: '',
    },
  ];
}

// Применить выбор игрока и подготовить следующий ход.
export function choose(state: GameState, optionIndex: number): GameState {
  if (state.status !== 'playing' || !state.current) return state;
  const ev = state.current;
  const options = currentOptions(state);
  const option = options[optionIndex];
  if (!option) return state;

  const rng = createRng(state.seed + state.turn * 2654435761);
  const profile = DIFFICULTY[state.difficulty];
  const before = { ...state.resources };

  // 1. Мгновенные эффекты варианта (стоимость масштабируется сложностью для трат).
  if (option.immediate) {
    applyImmediate(state.resources, option.immediate, profile.costMul);
  }

  // 2. Прокачка процесса.
  if (option.defenseUpgrade) {
    state.defenses[option.defenseUpgrade] = Math.min(
      DEFENSE_MAX_LEVEL,
      state.defenses[option.defenseUpgrade] + 1,
    );
  }

  // 3. Остаточный урон угрозы (после защит и выбранного варианта).
  let defended: boolean | undefined;
  if (ev.kind === 'threat' && ev.threat) {
    const m = mitigation(state.defenses, ev.threat);
    const residualShare = RESIDUAL_BY_KIND[option.kind] * (1 - m) * profile.threatDamageMul;
    if (residualShare > 0) {
      addDelta(state.resources, scaleDelta(ev.threat.baseImpact, residualShare));
    }
    state.threatsFaced += 1;
    defended = option.resolvesThreat;
    if (defended) state.threatsDefended += 1;
  }

  // 4. Отложенные (скрытые) риски.
  if (option.delayed) {
    for (const d of option.delayed) {
      state.pendingDelayed.push({ dueTurn: state.turn + d.afterTurns, effect: d });
    }
  }

  normalize(state.resources);

  const delta: ResourceDelta = {};
  for (const key of Object.keys(state.resources) as (keyof Resources)[]) {
    const diff = state.resources[key] - before[key];
    if (diff !== 0) delta[key] = diff;
  }

  const record: TurnRecord = {
    turn: state.turn,
    kind: ev.kind,
    threatId: ev.threat?.id,
    threatTitle: ev.threat?.title,
    tier: ev.threat?.tier,
    defendedBy: ev.threat?.defendedBy,
    optionText: option.text,
    optionKind: option.kind,
    defended,
    delta,
  };
  state.log.push(record);

  if (checkLoss(state)) return state;
  advance(state, rng);
  return state;
}

// Траты (отрицательные budget/team) умножаются на costMul, выгоды — нет.
function applyImmediate(res: Resources, delta: ResourceDelta, costMul: number): void {
  for (const key of Object.keys(delta) as (keyof Resources)[]) {
    const v = delta[key] ?? 0;
    const isCost = (key === 'budget' || key === 'team') && v < 0;
    res[key] += isCost ? Math.round(v * costMul) : v;
  }
}

function normalize(res: Resources): void {
  res.clientTrust = clamp(res.clientTrust, -999, 100);
  res.peerTrust = clamp(res.peerTrust, -999, 100);
  res.team = clamp(res.team, -999, 100);
  res.techDebt = Math.max(0, res.techDebt);
  // budget может уйти в минус — это условие поражения.
}

function checkLoss(state: GameState): boolean {
  const r = state.resources;
  let reason: string | undefined;
  if (r.clientTrust <= 0) reason = 'Клиенты ушли: доверие клиентов упало до нуля.';
  else if (r.peerTrust <= 0) reason = 'Коллеги отвернулись: процессы окончательно сломаны.';
  else if (r.team <= 0) reason = 'Команда выгорела: работать стало некому.';
  else if (r.budget < 0) reason = 'Бюджет исчерпан: на ликвидацию последствий не хватило денег.';
  else if (r.techDebt >= TECH_DEBT_LOSS) reason = 'Технический долг похоронил продукт.';

  if (reason) {
    state.status = 'lost';
    state.lossReason = reason;
    // Подчищаем отрицательные значения для отображения.
    r.clientTrust = Math.max(0, r.clientTrust);
    r.peerTrust = Math.max(0, r.peerTrust);
    r.team = Math.max(0, r.team);
    return true;
  }
  return false;
}

function finish(state: GameState): void {
  const profile = DIFFICULTY[state.difficulty];
  const ratio = state.threatsFaced > 0 ? state.threatsDefended / state.threatsFaced : 0;
  if (ratio >= profile.winRatio) {
    state.status = 'won';
  } else {
    state.status = 'lost';
    state.lossReason = `Период завершён, но отражено лишь ${Math.round(ratio * 100)}% угроз (нужно ${Math.round(
      profile.winRatio * 100,
    )}%).`;
  }
  state.current = null;
}

export function defendedRatio(state: GameState): number {
  return state.threatsFaced > 0 ? state.threatsDefended / state.threatsFaced : 0;
}

// Реэкспорт для удобства потребителей движка.
export { mergeDelta };
