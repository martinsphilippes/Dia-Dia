export type PlayFormat = "simples" | "duplas" | "ambos";

/* ---------------- MatchPoint (sparrings / jogadores disponíveis) ---------------- */
export type MpMode = "none" | "available" | "sparring";

export const MP_MODE_LABELS: Record<MpMode, string> = {
  none: "Não participar",
  available: "Jogador Disponível",
  sparring: "Parceiro de Treino",
};

export const MP_PREFS = ["treino", "amistoso", "simples", "duplas"];

export type MpSearchRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  city: string | null;
  skill_class: SkillClass;
  mp_mode: MpMode;
  price_cents: number | null;
  price_unit: string | null;
  clubs: string | null;
  notes: string | null;
  mp_days: number[] | null;
  time_start: string | null;
  time_end: string | null;
  prefs: string[] | null;
  distance_km: number | null;
  rating: number;
  review_count: number;
  matches_count: number;
};

export type MpProfile = MpSearchRow & { bio: string | null; phone: string | null };

export type MpReview = {
  rater_name: string;
  rater_avatar: string | null;
  stars: number;
  comment: string | null;
  created_at: string;
};

export type MpRequestDetail = {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_avatar: string | null;
  requester_phone: string | null;
  city: string | null;
  club: string | null;
  desired_at: string | null;
  level: number | null;
  modality: string | null;
  note: string | null;
  status: string;
  created_at: string;
  is_mine: boolean;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};
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
  height_cm?: number | null;
  latitude: number | null;
  longitude: number | null;
  search_radius_km: number;
  is_admin: boolean;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
  // Presente apenas quando vem de get_discovery_profiles
  distance_km?: number | null;
  // Participação no MatchPoint
  mp_mode?: MpMode;
  mp_active?: boolean;
  mp_price_cents?: number | null;
  mp_price_unit?: string | null;
  mp_clubs?: string | null;
  mp_days?: number[] | null;
  mp_time_start?: string | null;
  mp_time_end?: string | null;
  mp_notes?: string | null;
  mp_prefs?: string[] | null;
  state?: string | null;
  accept_ranking_invites?: string | null;
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

export type AdminTournamentRow = {
  id: string;
  name: string;
  city: string | null;
  status: string;
  organizer_name: string;
  category_count: number;
  entry_count: number;
  created_at: string;
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
  club_id: string | null;
  club_name: string | null;
  status: "ativo" | "arquivado";
  round_prefix: string;
};

export type ArchivedLeague = {
  league_id: string;
  league_name: string;
  club_name: string | null;
  deleted_by_name: string | null;
  reason: string | null;
  affected_matches: number;
  affected_bookings: number;
  deleted_at: string;
};

/* ---------------- Descoberta / entrada em rankings ---------------- */
export type AcceptInvites = "no" | "same_city" | "25" | "50" | "100" | "any";

export const ACCEPT_INVITES_LABELS: Record<AcceptInvites, string> = {
  no: "Não aceitar convites",
  same_city: "Só da mesma cidade",
  "25": "Até 25 km",
  "50": "Até 50 km",
  "100": "Até 100 km",
  any: "Qualquer distância",
};

export type LeagueVisibility =
  | "public_approval"
  | "nearby_only"
  | "private"
  | "invite_only"
  | "closed";

export const VISIBILITY_LABELS: Record<LeagueVisibility, string> = {
  public_approval: "Público (com aprovação)",
  nearby_only: "Visível só para quem está perto",
  private: "Privado",
  invite_only: "Só por convite",
  closed: "Fechado para novas entradas",
};

export type NearbyLeague = {
  id: string;
  name: string;
  club_name: string | null;
  city: string | null;
  state: string | null;
  distance_km: number | null;
  member_count: number;
  status: string;
  my_request_status: string | null;
  has_invite: boolean;
};

export type JoinRequest = {
  request_id: string;
  player_id: string;
  name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  skill_class: SkillClass;
  clubs: string | null;
  other_rankings: number;
  distance_km: number | null;
  message: string | null;
  created_at: string;
};

export type PossibleAthlete = {
  player_id: string;
  name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  skill_class: SkillClass;
  clubs: string | null;
  other_rankings: number;
  availability: AcceptInvites;
  distance_km: number | null;
};

export type MyRankingInvite = {
  invite_id: string;
  league_id: string;
  league_name: string;
  club_name: string | null;
  organizer_name: string | null;
  class_label: string | null;
  message: string | null;
  deadline: string | null;
  created_at: string;
};

export type LeagueDiscovery = {
  visibility: LeagueVisibility;
  discovery_radius_km: number;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  max_participants: number | null;
  entry_deadline: string | null;
  member_count: number;
  is_manager: boolean;
};

export type MyClub = {
  id: string;
  name: string;
  booking_required: boolean;
  court_count: number;
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

/* ---------------- Quadras / agenda ---------------- */
export type LeagueSchedule = {
  club_id: string | null;
  club_name: string | null;
  match_days: number[]; // 0=Dom .. 6=Sáb
  slot_start: string; // "07:00:00"
  slot_end: string; // "22:00:00"
  slot_minutes: number;
  has_courts: boolean;
  is_manager: boolean;
};

export type CourtRow = {
  club_id: string;
  club_name: string;
  booking_required: boolean;
  court_id: string | null;
  court_name: string | null;
};

export type CourtAvailability = {
  club_id: string;
  club_name: string;
  booking_required: boolean;
  court_id: string;
  court_name: string;
  is_free: boolean;
};

export type DayBooking = {
  court_id: string;
  court_name: string;
  club_name: string;
  starts_at: string;
  ends_at: string;
  challenger_name: string | null;
  challenged_name: string | null;
};

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

export type MatchStatus = "marcar" | "agendado" | "jogado" | "aberto" | "bye" | "cancelado";

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

export type PlayerLeagueMatch = {
  match_id: string;
  round_number: number;
  opponent_name: string;
  opponent_avatar: string | null;
  is_challenger: boolean;
  status: MatchStatus;
  result_type: ResultType;
  sets_player: number | null;
  sets_opp: number | null;
  games: SetGame[] | null;
  points: number;
  scheduled_at: string | null;
  location: string | null;
};

export type Head2HeadRow = {
  player_id: string;
  name: string;
  avatar_url: string | null;
  skill_class: SkillClass;
  standing_pos: number | null;
  best_pos: number | null;
  h2h_wins: number;
  sets_won: number;
  games_won: number;
  played: number;
};

export type RankingPlayerProfile = {
  id: string;
  name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  birthdate: string | null;
  gender: string | null;
  dominant_hand: DominantHand | null;
  play_format: PlayFormat;
  bio: string | null;
  skill_class: SkillClass;
  phone: string | null;
  clubs: string | null;
  availability: string[] | null;
  height_cm: number | null;
  created_at: string;
};

export type PlayerTournament = {
  tournament_id: string;
  tournament_name: string;
  category_id: string;
  category_name: string;
  note: string | null;
  placement: string;
  is_champion: boolean;
  wins: number;
  losses: number;
};

export type PlayerRoundPoints = {
  round_number: number;
  round_date: string;
  points: number;
  opponent_name: string;
  sets_player: number | null;
  sets_opp: number | null;
  games: SetGame[] | null;
  status: MatchStatus;
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
  cancelado: "Cancelado",
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
  is_manager: boolean;
  entry_fee_cents: number | null;
};

export type TournamentEntryAdmin = {
  entry_id: string;
  player_id: string;
  name: string;
  avatar_url: string | null;
  category_id: string;
  category_name: string;
  created_at: string;
  status: string;
  paid: boolean;
};

export type TournamentFormat = "eliminatoria" | "grupos";

export type TournamentCategory = {
  id: string;
  name: string;
  entry_count: number;
  am_registered: boolean;
  has_bracket: boolean;
  format: TournamentFormat;
  advance_per_group: number | null;
  note: string | null;
};

export type CategoryEntry = {
  player_id: string;
  name: string;
  avatar_url: string | null;
  city: string | null;
  skill_class: SkillClass;
  seed: number | null;
};

export type GroupStanding = {
  group_no: number;
  player_id: string;
  name: string;
  avatar_url: string | null;
  played: number;
  wins: number;
  sets_won: number;
  sets_lost: number;
  rank: number;
  qualifies: boolean;
};

export type GroupMatch = {
  match_id: string;
  group_no: number;
  player_a_id: string | null;
  player_a_name: string | null;
  player_a_avatar: string | null;
  player_b_id: string | null;
  player_b_name: string | null;
  player_b_avatar: string | null;
  winner_id: string | null;
  sets_a: number | null;
  sets_b: number | null;
  status: string;
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
