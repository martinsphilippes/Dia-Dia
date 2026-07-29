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
  is_organizer: boolean;
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

// ===================== Ranking =====================

export type LeagueSummary = {
  id: string;
  name: string;
  city: string | null;
  is_organizer: boolean;
  member_count: number;
};

export type OpenLeague = {
  id: string;
  name: string;
  city: string | null;
  organizer_name: string;
  member_count: number;
  am_member: boolean;
};

export type LeagueDetail = {
  id: string;
  name: string;
  city: string | null;
  description: string | null;
  about_text: string | null;
  organizer_id: string;
  organizer_name: string;
  is_organizer: boolean;
  is_owner: boolean;
  am_member: boolean;
  member_count: number;
  current_round_id: string | null;
  current_round_number: number | null;
};

export type MemberStatus = "ativo" | "licenciado" | "suspenso" | "desativado";

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  ativo: "Ativo",
  licenciado: "Licenciado",
  suspenso: "Suspenso",
  desativado: "Desativado",
};

export type LeagueMember = {
  player_id: string;
  name: string;
  avatar_url: string | null;
  is_organizer: boolean;
  status: MemberStatus;
};

export type ResultType = "normal" | "proset" | "wo" | "curinga";

export type SetGame = { c: number; d: number };

export type Standing = {
  pos: number;
  player_id: string;
  name: string;
  avatar_url: string | null;
  city: string | null;
  skill_class: SkillClass;
  points: number;
  games: number;
};

export type RoundInfo = {
  id: string;
  number: number;
  status: string;
  match_count: number;
  played_count: number;
};

export type MatchStatus = "marcar" | "agendado" | "jogado" | "aberto" | "bye";

export type RoundMatch = {
  match_id: string;
  challenger_id: string;
  challenger_name: string;
  challenger_avatar: string | null;
  challenged_id: string;
  challenged_name: string;
  challenged_avatar: string | null;
  status: MatchStatus;
  result_type: ResultType;
  scheduled_at: string | null;
  location: string | null;
  sets_challenger: number | null;
  sets_challenged: number | null;
  games: SetGame[] | null;
  challenger_points: number;
  challenged_points: number;
};

export type MyLeagueMatch = {
  match_id: string;
  round_number: number;
  opponent_id: string;
  opponent_name: string;
  opponent_avatar: string | null;
  opponent_phone: string | null;
  am_challenger: boolean;
  status: MatchStatus;
  result_type: ResultType;
  scheduled_at: string | null;
  location: string | null;
  sets_me: number | null;
  sets_opp: number | null;
  games: SetGame[] | null;
  my_points: number;
};

export type MyPointsRow = {
  round_number: number;
  opponent_name: string;
  am_challenger: boolean;
  sets_me: number | null;
  sets_opp: number | null;
  points: number;
  status: MatchStatus;
  played_at: string | null;
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  marcar: "A marcar",
  agendado: "Agendado",
  jogado: "Jogado",
  aberto: "Sem pontuação",
  bye: "Folga",
};

// ===================== Torneios =====================

export type TournamentStatus = "inscricoes" | "em_andamento" | "encerrado";

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  inscricoes: "Inscrições abertas",
  em_andamento: "Em andamento",
  encerrado: "Encerrado",
};

export type TournamentSummary = {
  id: string;
  name: string;
  city: string | null;
  status: TournamentStatus;
  is_organizer: boolean;
};

export type OpenTournament = {
  id: string;
  name: string;
  city: string | null;
  organizer_name: string;
  category_count: number;
  entry_count: number;
};

export type TournamentDetail = {
  id: string;
  name: string;
  city: string | null;
  description: string | null;
  status: TournamentStatus;
  organizer_id: string;
  organizer_name: string;
  is_organizer: boolean;
  is_owner: boolean;
};

export type TournamentCategory = {
  id: string;
  name: string;
  entry_count: number;
  am_registered: boolean;
  has_bracket: boolean;
};

export type CategoryEntry = {
  player_id: string;
  name: string;
  avatar_url: string | null;
  city: string | null;
  skill_class: SkillClass;
};

export type BracketStatus = "aguardando" | "pronto" | "jogado" | "bye";

export type BracketMatch = {
  match_id: string;
  round_no: number;
  slot: number;
  total_rounds: number;
  player_a_id: string | null;
  player_a_name: string | null;
  player_a_avatar: string | null;
  player_b_id: string | null;
  player_b_name: string | null;
  player_b_avatar: string | null;
  winner_id: string | null;
  sets_a: number | null;
  sets_b: number | null;
  status: BracketStatus;
};

// Rótulo da fase do chaveamento (a partir do total de rodadas)
export function bracketRoundLabel(roundNo: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundNo; // 0 = final
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinal";
  if (fromEnd === 2) return "Quartas de final";
  if (fromEnd === 3) return "Oitavas de final";
  const playersInRound = Math.pow(2, totalRounds - roundNo + 1);
  return `${playersInRound} avos`;
}
