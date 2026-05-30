import { DEFENSE_KEYS, DEFENSE_LABELS, type DefenseKey, type GameState } from './state';
import { defendedRatio } from './engine';

export interface ScoreBreakdown {
  total: number;
  ratio: number;
  topDefenses: { key: DefenseKey; label: string; level: number; credited: number }[];
  ignoredRisks: { title: string; defendedBy: string }[];
  hacks: number; // сколько раз выбрали «костыль»
}

export function computeScore(state: GameState): number {
  const r = state.resources;
  const ratio = defendedRatio(state);
  const resourcePoints = r.clientTrust + r.peerTrust + r.team + r.budget + (100 - Math.min(100, r.techDebt));
  const defenseBonus = DEFENSE_KEYS.reduce((sum, k) => sum + state.defenses[k] * 10, 0);
  const ratioBonus = Math.round(ratio * 200);
  const winBonus = state.status === 'won' ? 300 : 0;
  return Math.max(0, Math.round(resourcePoints + defenseBonus + ratioBonus + winBonus));
}

export function analyze(state: GameState): ScoreBreakdown {
  // Какие защиты внесли вклад: считаем, сколько отражённых угроз они «прикрывали».
  const credited: Record<DefenseKey, number> = Object.fromEntries(
    DEFENSE_KEYS.map((k) => [k, 0]),
  ) as Record<DefenseKey, number>;

  let hacks = 0;
  const ignoredRisks: { title: string; defendedBy: string }[] = [];

  for (const rec of state.log) {
    if (rec.optionKind === 'hack') hacks += 1;
    if (rec.kind !== 'threat') continue;
    if (rec.defended) {
      for (const key of rec.defendedBy ?? []) {
        if (state.defenses[key] > 0) credited[key] += 1;
      }
    } else {
      ignoredRisks.push({
        title: rec.threatTitle ?? rec.threatId ?? 'угроза',
        defendedBy: (rec.defendedBy ?? []).map((k) => DEFENSE_LABELS[k]).join(', '),
      });
    }
  }

  const topDefenses = DEFENSE_KEYS.map((key) => ({
    key,
    label: DEFENSE_LABELS[key],
    level: state.defenses[key],
    credited: credited[key],
  }))
    .filter((d) => d.level > 0 || d.credited > 0)
    .sort((a, b) => b.credited - a.credited || b.level - a.level)
    .slice(0, 4);

  return {
    total: computeScore(state),
    ratio: defendedRatio(state),
    topDefenses,
    ignoredRisks,
    hacks,
  };
}
