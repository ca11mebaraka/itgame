import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// anon-ключ публичный по дизайну: его можно держать в клиенте, защита — через RLS.
// Если переменные не заданы (например, локальный запуск без .env) — клиент = null,
// и игра деградирует на локальный лидерборд (localStorage).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;

export const supabaseEnabled = supabase !== null;
