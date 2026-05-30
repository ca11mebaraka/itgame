import { describe, it, expect } from 'vitest';
import { choose, currentOptions, startGame } from '../src/engine/engine';
import { DIFFICULTY } from '../src/engine/balance';
import type { GameState } from '../src/engine/state';

function playWith(state: GameState, pickIndex: (s: GameState) => number): GameState {
  let guard = 0;
  while (state.status === 'playing' && guard++ < 100) {
    const options = currentOptions(state);
    expect(options.length).toBeGreaterThan(0);
    choose(state, pickIndex(state));
  }
  expect(state.status).not.toBe('playing');
  return state;
}

describe('движок', () => {
  it('стартует в игровом состоянии с корректным расписанием', () => {
    const s = startGame({ difficulty: 'normal', seed: 1 });
    expect(s.status).toBe('playing');
    expect(s.totalTurns).toBe(DIFFICULTY.normal.totalTurns);
    expect(s.current).not.toBeNull();
    expect(s.threatsTotal).toBeGreaterThan(0);
  });

  it('детерминирован по seed', () => {
    const a = startGame({ seed: 42 });
    const b = startGame({ seed: 42 });
    expect(a.current?.threat?.id ?? a.current?.random?.id).toBe(
      b.current?.threat?.id ?? b.current?.random?.id,
    );
  });

  it('игра завершается и ресурсы остаются числами', () => {
    const s = playWith(startGame({ seed: 7 }), () => 0);
    for (const v of Object.values(s.resources)) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(['won', 'lost']).toContain(s.status);
  });

  it('не отражённые угрозы не засчитываются как defended', () => {
    const s = startGame({ seed: 3 });
    // выбираем последний вариант (обычно «забить» / худший)
    playWith(s, (st) => currentOptions(st).length - 1);
    expect(s.threatsDefended).toBeLessThanOrEqual(s.threatsFaced);
  });
});
