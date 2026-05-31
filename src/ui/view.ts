import type { GameState, Resources } from '../engine/state';

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface ResourceMeta {
  key: keyof Resources;
  label: string;
  icon: string;
  inverse: boolean; // true → больше = хуже (технический долг)
}

const RESOURCE_META: ResourceMeta[] = [
  { key: 'clientTrust', label: 'Доверие клиентов', icon: '🤝', inverse: false },
  { key: 'peerTrust', label: 'Доверие коллег', icon: '🧑‍💻', inverse: false },
  { key: 'techDebt', label: 'Технический долг', icon: '🧱', inverse: true },
  { key: 'team', label: 'Команда', icon: '👥', inverse: false },
  { key: 'budget', label: 'Бюджет', icon: '💰', inverse: false },
];

function tone(value: number, inverse: boolean): string {
  const v = inverse ? 100 - value : value;
  if (v >= 60) return 'good';
  if (v >= 30) return 'warn';
  return 'bad';
}

export function renderResources(res: Resources): string {
  const rows = RESOURCE_META.map((m) => {
    const value = Math.round(res[m.key]);
    const pct = Math.max(0, Math.min(100, value));
    const cls = tone(pct, m.inverse);
    return `
      <div class="res-row">
        <span class="res-label">${m.icon} ${esc(m.label)}</span>
        <span class="res-bar"><span class="res-fill ${cls}" style="width:${pct}%"></span></span>
        <span class="res-value ${cls}">${value}</span>
      </div>`;
  }).join('');
  return `<div class="resources"><div class="resources-title">📊 Ресурсы</div>${rows}</div>`;
}

// Изменения ресурсов после хода — цветные чипы со знаком.
export function renderDeltas(delta: Partial<Resources>): string {
  const chips = RESOURCE_META.filter((m) => (delta[m.key] ?? 0) !== 0)
    .map((m) => {
      const v = delta[m.key] as number;
      // «хорошо» = рост ресурса; для техдолга наоборот — рост это плохо.
      const positive = m.inverse ? v < 0 : v > 0;
      const cls = positive ? 'good' : 'bad';
      const sign = v > 0 ? '+' : '';
      return `<span class="delta-chip ${cls}">${m.icon} ${esc(m.label)}: ${sign}${v}</span>`;
    })
    .join('');
  return chips ? `<div class="deltas">${chips}</div>` : '<p class="muted">Ресурсы не изменились.</p>';
}

export function renderProgress(state: GameState): string {
  const defended = state.threatsFaced > 0 ? Math.round((state.threatsDefended / state.threatsFaced) * 100) : 0;
  return `
    <div class="progress">
      <span>Ход ${state.turn} / ${state.totalTurns}</span>
      <span>Отражено угроз: ${state.threatsDefended}/${state.threatsFaced} (${defended}%)</span>
    </div>`;
}
