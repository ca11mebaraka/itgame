import { describe, it, expect } from 'vitest';
import { choose, currentOptions, startGame } from '../src/engine/engine';
import type { Difficulty, GameState, OptionKind } from '../src/engine/state';

// Стратегии игрока для проверки баланса.
function byKind(state: GameState, order: OptionKind[]): number {
  const options = currentOptions(state);
  for (const kind of order) {
    const i = options.findIndex((o) => o.kind === kind);
    if (i >= 0) return i;
  }
  return 0;
}

const goodPolicy = (s: GameState): number => {
  const options = currentOptions(s);
  const rec = options.findIndex((o) => o.recommended);
  if (rec >= 0) return rec;
  return byKind(s, ['process', 'invest']);
};

// Разумная смешанная стратегия: вкладываемся в процессы, пока есть бюджет,
// иначе действуем по процессу. «Инвестировать вообще всё подряд» — банкротство.
const balancedPolicy = (s: GameState): number => {
  const options = currentOptions(s);
  if (s.resources.budget > 45) {
    const invest = options.findIndex((o) => o.kind === 'invest');
    if (invest >= 0) return invest;
  }
  return byKind(s, ['process', 'invest']);
};
const recklessPolicy = (s: GameState): number => byKind(s, ['hack', 'ignore']);
const lazyPolicy = (s: GameState): number => byKind(s, ['ignore', 'hack']);

function simulate(seed: number, difficulty: Difficulty, policy: (s: GameState) => number): GameState {
  const state = startGame({ seed, difficulty });
  let guard = 0;
  while (state.status === 'playing' && guard++ < 100) {
    choose(state, policy(state));
  }
  expect(state.status).not.toBe('playing');
  return state;
}

const SEEDS = Array.from({ length: 40 }, (_, i) => i * 101 + 7);

describe('баланс', () => {
  it('игра по процессу выигрывает на normal на всех seed', () => {
    for (const seed of SEEDS) {
      const s = simulate(seed, 'normal', goodPolicy);
      expect(s.status, `seed ${seed}: ${s.lossReason ?? ''}`).toBe('won');
    }
  });

  it('смешанная стратегия (инвестиции + процесс) доводит до победы на normal', () => {
    let wins = 0;
    for (const seed of SEEDS) {
      if (simulate(seed, 'normal', balancedPolicy).status === 'won') wins += 1;
    }
    expect(wins / SEEDS.length).toBeGreaterThanOrEqual(0.9);
  });

  it('костыли на всё ведут к поражению (скрытые риски срабатывают)', () => {
    let losses = 0;
    for (const seed of SEEDS) {
      if (simulate(seed, 'normal', recklessPolicy).status === 'lost') losses += 1;
    }
    expect(losses / SEEDS.length).toBeGreaterThanOrEqual(0.9);
  });

  it('игнорирование угроз — это поражение', () => {
    for (const seed of SEEDS) {
      expect(simulate(seed, 'normal', lazyPolicy).status).toBe('lost');
    }
  });

  it('ресурсы всегда конечны', () => {
    for (const policy of [goodPolicy, balancedPolicy, recklessPolicy, lazyPolicy]) {
      for (const seed of SEEDS.slice(0, 10)) {
        const s = simulate(seed, 'normal', policy);
        for (const v of Object.values(s.resources)) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });
});
