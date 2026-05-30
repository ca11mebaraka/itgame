import { supabase, supabaseEnabled } from './supabase';
import type { Difficulty } from '../engine/state';

export interface RunPayload {
  nickname: string;
  score: number;
  outcome: 'won' | 'lost';
  turns: number;
  threatsFaced: number;
  threatsDefended: number;
  lossReason?: string;
  defensePeak: Record<string, number>;
  durationSeconds: number;
  difficulty: Difficulty;
}

export interface LeaderRow {
  nickname: string;
  score: number;
  turns: number;
  threats_defended: number;
  threats_faced: number;
  created_at: string;
}

const UID_KEY = 'boa_client_uid';
const LOCAL_BOARD_KEY = 'boa_local_leaderboard';

export function getClientUid(): string {
  let uid = localStorage.getItem(UID_KEY);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(UID_KEY, uid);
  }
  return uid;
}

export const leaderboardOnline = supabaseEnabled;

export async function submitRun(payload: RunPayload): Promise<{ rank: number | null; online: boolean }> {
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('submit_run', {
        p_nickname: payload.nickname,
        p_client_uid: getClientUid(),
        p_score: payload.score,
        p_outcome: payload.outcome,
        p_turns: payload.turns,
        p_threats_faced: payload.threatsFaced,
        p_threats_defended: payload.threatsDefended,
        p_loss_reason: payload.lossReason ?? null,
        p_defense_peak: payload.defensePeak,
        p_duration_seconds: payload.durationSeconds,
      });
      if (!error) {
        const rank = (data as { rank?: number | null } | null)?.rank ?? null;
        return { rank, online: true };
      }
      console.warn('submit_run failed, falling back to local:', error.message);
    } catch (e) {
      console.warn('submit_run threw, falling back to local:', e);
    }
  }
  saveLocal(payload);
  return { rank: null, online: false };
}

export async function fetchTop(limit = 10): Promise<{ rows: LeaderRow[]; online: boolean }> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('nickname, score, turns, threats_defended, threats_faced, created_at')
        .order('score', { ascending: false })
        .limit(limit);
      if (!error && data) return { rows: data as LeaderRow[], online: true };
    } catch (e) {
      console.warn('fetchTop threw, falling back to local:', e);
    }
  }
  return { rows: loadLocal(limit), online: false };
}

// ── Локальный фоллбэк ──
function saveLocal(payload: RunPayload): void {
  if (payload.outcome !== 'won') return;
  const board = loadLocalRaw();
  board.push({
    nickname: payload.nickname,
    score: payload.score,
    turns: payload.turns,
    threats_defended: payload.threatsDefended,
    threats_faced: payload.threatsFaced,
    created_at: new Date().toISOString(),
  });
  board.sort((a, b) => b.score - a.score);
  localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(board.slice(0, 50)));
}

function loadLocalRaw(): LeaderRow[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_BOARD_KEY) ?? '[]') as LeaderRow[];
  } catch {
    return [];
  }
}

function loadLocal(limit: number): LeaderRow[] {
  return loadLocalRaw().slice(0, limit);
}
