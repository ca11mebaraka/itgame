import { choose, currentOptions, startGame } from '../engine/engine';
import { analyze } from '../engine/scoring';
import { DIFFICULTY } from '../engine/balance';
import type { Difficulty, GameState } from '../engine/state';
import { fetchTop, submitRun, type LeaderRow } from '../services/leaderboard';
import { esc, renderProgress, renderResources } from './view';
import splashUrl from '../../product-manager-pixel-art.svg';

export class App {
  private root: HTMLElement;
  private state: GameState | null = null;
  private nickname = '';
  private difficulty: Difficulty = 'normal';
  private submitted = false;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  start(): void {
    this.nickname = localStorage.getItem('boa_nickname') ?? '';
    this.renderSplash();
  }

  // ───────────────────────── Сплеш-экран ─────────────────────────
  private renderSplash(): void {
    this.root.innerHTML = `
      <main class="card splash" id="splash" role="button" tabindex="0" aria-label="Начать">
        <img class="splash-art" src="${splashUrl}" alt="БекОфисные приключения" />
        <h1 class="splash-title">БекОфисные приключения</h1>
        <p class="splash-hint">нажмите, чтобы начать</p>
      </main>`;

    let dismissed = false;
    let timer = 0;
    const go = (): void => {
      if (dismissed) return;
      dismissed = true;
      window.clearTimeout(timer);
      this.renderMenu();
    };
    timer = window.setTimeout(go, 2800);
    const splash = this.$('#splash');
    splash.addEventListener('click', go);
    splash.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') go();
    });
  }

  // ───────────────────────── Меню ─────────────────────────
  private renderMenu(): void {
    this.root.innerHTML = `
      <main class="card intro">
        <h1>БекОфисные приключения</h1>
        <p class="subtitle">Ты — руководитель продукта. Десять минут, поток инцидентов и один простой план: довести компанию через рабочий период, отражая угрозы и не уронив доверие.</p>
        <ul class="rules">
          <li>Каждый ход — ситуация и 3–4 варианта действий. Последствия бывают отложенными.</li>
          <li>Цель: отразить достаточно угроз и не допустить критического инцидента.</li>
          <li>Лёгкие костыли спасают сейчас и мстят потом.</li>
        </ul>
        <label class="field">
          <span>Ваш ник</span>
          <input id="nickname" maxlength="24" placeholder="например, RelizMaster" value="${esc(this.nickname)}" />
        </label>
        <label class="field">
          <span>Сложность</span>
          <select id="difficulty">
            <option value="casual">Casual — мягко, с подсказками</option>
            <option value="normal" selected>Normal — как в жизни</option>
            <option value="hardcore">Hardcore — без права на ошибку</option>
          </select>
        </label>
        <div class="actions">
          <button id="play" class="primary">Начать смену</button>
          <button id="show-board" class="ghost">Таблица лидеров</button>
        </div>
        <div id="board-slot"></div>
      </main>`;

    const nickInput = this.$('#nickname') as HTMLInputElement;
    const diffSelect = this.$('#difficulty') as HTMLSelectElement;
    diffSelect.value = this.difficulty;

    this.$('#play').addEventListener('click', () => {
      this.nickname = nickInput.value.trim();
      this.difficulty = diffSelect.value as Difficulty;
      if (this.nickname.length < 2) {
        nickInput.focus();
        nickInput.classList.add('invalid');
        return;
      }
      localStorage.setItem('boa_nickname', this.nickname);
      this.beginGame();
    });

    this.$('#show-board').addEventListener('click', () => {
      void this.showBoardInto('#board-slot');
    });
  }

  private beginGame(): void {
    this.state = startGame({ difficulty: this.difficulty });
    this.submitted = false;
    this.renderGame();
  }

  // ───────────────────────── Игра ─────────────────────────
  private renderGame(): void {
    const state = this.state;
    if (!state) return;
    if (state.status !== 'playing') {
      this.renderEnd();
      return;
    }
    const ev = state.current;
    if (!ev) return;

    const banners = ev.delayedBanners
      .map((b) => `<div class="banner delayed">⏳ ${esc(b)}</div>`)
      .join('');

    let body = '';
    let optionsHtml = '';
    const options = currentOptions(state);
    const showAdvisor = DIFFICULTY[state.difficulty].showAdvisor;

    if (ev.kind === 'threat' && ev.threat) {
      const tierBadge =
        ev.threat.tier === 'boss' ? '👹 Босс' : ev.threat.tier === 'rare' ? '⚠️ Редкая угроза' : '🔧 Угроза';
      body = `
        <div class="event-tier ${ev.threat.tier}">${tierBadge}</div>
        <h2>${esc(ev.threat.title)}</h2>
        <p class="situation">${esc(ev.threat.intro)}</p>`;
      optionsHtml = options
        .map((o, i) => {
          const rec = showAdvisor && o.recommended ? '<span class="rec">рекомендуется</span>' : '';
          return `<button class="option" data-index="${i}"><span class="opt-num">${i + 1}</span><span>${esc(
            o.text,
          )}</span>${rec}</button>`;
        })
        .join('');
    } else if (ev.random) {
      body = `<div class="event-tier random">☕ Тем временем в офисе</div><p class="situation">${esc(
        ev.random.text,
      )}</p>`;
      optionsHtml = `<button class="option" data-index="0"><span>Дальше →</span></button>`;
    }

    this.root.innerHTML = `
      <main class="card game">
        ${renderProgress(state)}
        ${renderResources(state.resources)}
        <div class="event">
          ${banners}
          ${body}
        </div>
        <div class="options">${optionsHtml}</div>
        ${this.feedbackSlot()}
      </main>`;

    this.root.querySelectorAll('.option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number((btn as HTMLElement).dataset.index);
        this.onChoose(idx);
      });
    });
  }

  private lastFeedback: string | null = null;

  private feedbackSlot(): string {
    if (!this.lastFeedback) return '';
    const html = `<div class="banner feedback">✅ ${esc(this.lastFeedback)}</div>`;
    this.lastFeedback = null;
    return html;
  }

  private onChoose(index: number): void {
    const state = this.state;
    if (!state || !state.current) return;
    const options = currentOptions(state);
    this.lastFeedback = options[index]?.feedback || null;
    choose(state, index);
    if (state.status === 'playing') this.renderGame();
    else this.renderEnd();
  }

  // ───────────────────────── Финал ─────────────────────────
  private renderEnd(): void {
    const state = this.state;
    if (!state) return;
    const report = analyze(state);
    const won = state.status === 'won';
    const durationSeconds = Math.round((Date.now() - state.startedAt) / 1000);

    const defensesHtml =
      report.topDefenses.length > 0
        ? `<ul>${report.topDefenses
            .map(
              (d) =>
                `<li><b>${esc(d.label)}</b> — уровень ${d.level}${
                  d.credited > 0 ? `, прикрыл угроз: ${d.credited}` : ''
                }</li>`,
            )
            .join('')}</ul>`
        : '<p class="muted">Процессы почти не развивались — играли «на руках».</p>';

    const ignoredHtml =
      report.ignoredRisks.length > 0
        ? `<ul>${report.ignoredRisks
            .map((r) => `<li><b>${esc(r.title)}</b>${r.defendedBy ? ` — помог бы: ${esc(r.defendedBy)}` : ''}</li>`)
            .join('')}</ul>`
        : '<p class="muted">Ни одной угрозы не пропущено. Образцово.</p>';

    this.root.innerHTML = `
      <main class="card end">
        <div class="outcome ${won ? 'won' : 'lost'}">${won ? '🏆 Период пройден' : '💥 Критический инцидент'}</div>
        ${state.lossReason ? `<p class="loss-reason">${esc(state.lossReason)}</p>` : ''}
        <div class="score">Счёт: <b>${report.total}</b></div>
        <div class="stats">
          <span>Отражено угроз: ${state.threatsDefended}/${state.threatsFaced} (${Math.round(
            report.ratio * 100,
          )}%)</span>
          <span>Костылей применено: ${report.hacks}</span>
        </div>
        <section>
          <h3>Что помогло больше всего</h3>
          ${defensesHtml}
        </section>
        <section>
          <h3>Какие риски проигнорированы</h3>
          ${ignoredHtml}
        </section>
        <div id="submit-status" class="muted">Сохраняем результат…</div>
        <div id="board-slot"></div>
        <div class="actions">
          <button id="again" class="primary">Сыграть снова</button>
          <button id="menu" class="ghost">В меню</button>
        </div>
      </main>`;

    this.$('#again').addEventListener('click', () => this.beginGame());
    this.$('#menu').addEventListener('click', () => this.renderMenu());

    void this.submitAndShow(durationSeconds);
  }

  private async submitAndShow(durationSeconds: number): Promise<void> {
    const state = this.state;
    if (!state) return;
    const statusEl = this.$('#submit-status');

    if (!this.submitted) {
      this.submitted = true;
      const res = await submitRun({
        nickname: this.nickname || 'Аноним',
        score: analyze(state).total,
        outcome: state.status === 'won' ? 'won' : 'lost',
        turns: state.log.length,
        threatsFaced: state.threatsFaced,
        threatsDefended: state.threatsDefended,
        lossReason: state.lossReason,
        defensePeak: { ...state.defenses },
        durationSeconds,
        difficulty: state.difficulty,
      });
      if (statusEl) {
        if (state.status !== 'won') {
          statusEl.textContent = 'В таблицу лидеров попадают только победы. В следующий раз!';
        } else if (res.online) {
          statusEl.textContent = res.rank ? `Результат сохранён. Ваше место: #${res.rank}.` : 'Результат сохранён.';
        } else {
          statusEl.textContent = 'Онлайн-таблица недоступна — результат сохранён локально.';
        }
      }
    }
    await this.showBoardInto('#board-slot');
  }

  // ───────────────────────── Лидерборд ─────────────────────────
  private async showBoardInto(selector: string): Promise<void> {
    const slot = this.$(selector);
    if (!slot) return;
    slot.innerHTML = '<div class="muted">Загружаем таблицу лидеров…</div>';
    const { rows, online } = await fetchTop(10);
    slot.innerHTML = this.renderBoard(rows, online);
  }

  private renderBoard(rows: LeaderRow[], online: boolean): string {
    if (rows.length === 0) {
      return '<div class="board"><div class="board-title">Таблица лидеров</div><p class="muted">Пока пусто — станьте первым.</p></div>';
    }
    const items = rows
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td><td>${esc(r.nickname)}</td><td>${r.score}</td><td>${r.threats_defended}/${
            r.threats_faced
          }</td></tr>`,
      )
      .join('');
    return `
      <div class="board">
        <div class="board-title">Таблица лидеров ${online ? '' : '<span class="muted">(локально)</span>'}</div>
        <table>
          <thead><tr><th>#</th><th>Игрок</th><th>Счёт</th><th>Угрозы</th></tr></thead>
          <tbody>${items}</tbody>
        </table>
      </div>`;
  }

  private $(selector: string): HTMLElement {
    return this.root.querySelector(selector) as HTMLElement;
  }
}
