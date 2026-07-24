export type PlayFormat = "simples" | "duplas" | "ambos";
export type DominantHand = "destro" | "canhoto";
export type SwipeDirection = "like" | "pass";

// Nível por classe do tênis: 1 = 1ª classe (melhor) ... 5 = 5ª classe (iniciante)
export type SkillClass = 1 | 2 | 3 | 4 | 5;
export const SKILL_CLASSES: SkillClass[] = [1, 2, 3, 4, 5];

export type Profile = {
  id: string;
  name: string;
  birthdate: string | null;
  gender: string | null;
  city: string | null;
  phone: string | null;
  bio: string | null;
  skill_class: SkillClass;
  dominant_hand: DominantHand | null;
  play_format: PlayFormat;
  availability: string[] | null;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  search_radius_km: number;
  is_admin: boolean;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
  // Presente apenas quando vem de get_discovery_profiles
  distance_km?: number | null;
};

// Linhas retornadas pelas RPCs de admin
export type AdminProfileRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  skill_class: SkillClass;
  play_format: PlayFormat;
  onboarded: boolean;
  is_admin: boolean;
  latitude: number | null;
  longitude: number | null;
  search_radius_km: number;
  created_at: string;
};

export type AdminMatchRow = {
  match_id: string;
  created_at: string;
  a_name: string;
  a_phone: string | null;
  b_name: string;
  b_phone: string | null;
  message_count: number;
};

export type MatchSummary = {
  match_id: string;
  matched_at: string;
  other_id: string;
  other_name: string;
  other_city: string | null;
  other_avatar_url: string | null;
  other_class: SkillClass;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

// Rótulos de UI
export const CLASS_LABELS: Record<SkillClass, string> = {
  1: "1ª classe",
  2: "2ª classe",
  3: "3ª classe",
  4: "4ª classe",
  5: "5ª classe",
};

export const CLASS_DESCRIPTIONS: Record<SkillClass, string> = {
  1: "Nível mais alto — disputo torneios e ranking",
  2: "Avançado — bom saque, controle e consistência",
  3: "Intermediário — jogo com regularidade",
  4: "Em evolução — já mantenho rallies",
  5: "Iniciante — estou começando, quero trocar bola",
};

export const FORMAT_LABELS: Record<PlayFormat, string> = {
  simples: "Simples",
  duplas: "Duplas",
  ambos: "Simples e Duplas",
};

export const HAND_LABELS: Record<DominantHand, string> = {
  destro: "Destro",
  canhoto: "Canhoto",
};

export const RADIUS_OPTIONS = [5, 10, 15, 20] as const;

export function formatDistance(km: number | null | undefined): string {
  if (km == null) return "";
  if (km < 1) return "menos de 1 km";
  return `a ${Math.round(km)} km`;
}
