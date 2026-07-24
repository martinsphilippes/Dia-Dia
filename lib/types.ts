export type SkillLevel = "iniciante" | "intermediario" | "avancado" | "competitivo";
export type PlayFormat = "simples" | "duplas" | "ambos";
export type DominantHand = "destro" | "canhoto";
export type SwipeDirection = "like" | "pass";

export type Profile = {
  id: string;
  name: string;
  birthdate: string | null;
  gender: string | null;
  city: string;
  state: string | null;
  country: string | null;
  bio: string | null;
  skill_level: SkillLevel;
  dominant_hand: DominantHand | null;
  play_format: PlayFormat;
  availability: string[] | null;
  avatar_url: string | null;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export type MatchSummary = {
  match_id: string;
  matched_at: string;
  other_id: string;
  other_name: string;
  other_city: string;
  other_avatar_url: string | null;
  other_skill: SkillLevel;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

// Metadados de UI para os enums
export const SKILL_LABELS: Record<SkillLevel, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
  competitivo: "Competitivo",
};

export const SKILL_DESCRIPTIONS: Record<SkillLevel, string> = {
  iniciante: "Estou começando, quero trocar bola e me divertir",
  intermediario: "Jogo com regularidade e mantenho rallies",
  avancado: "Bom controle, saque e consistência",
  competitivo: "Disputo torneios / ranking",
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

export const WEEKDAYS = [
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
  "Dom",
] as const;

export const PERIODS = ["Manhã", "Tarde", "Noite"] as const;

type MatchRow = {
  id: string;
  player_a_id: string;
  player_b_id: string;
  created_at: string;
};

type SwipeRow = {
  id: string;
  swiper_id: string;
  swiped_id: string;
  direction: SwipeDirection;
  created_at: string;
};

// Tipagem mínima do banco para os clients do Supabase
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; name: string; city: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      swipes: {
        Row: SwipeRow;
        Insert: {
          swiper_id: string;
          swiped_id: string;
          direction: SwipeDirection;
        };
        Update: Partial<SwipeRow>;
        Relationships: [];
      };
      matches: {
        Row: MatchRow;
        Insert: Partial<MatchRow>;
        Update: Partial<MatchRow>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: { match_id: string; sender_id: string; content: string };
        Update: Partial<Pick<Message, "read">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_discovery_profiles: {
        Args: Record<string, never>;
        Returns: Profile[];
      };
      get_my_matches: {
        Args: Record<string, never>;
        Returns: MatchSummary[];
      };
    };
    Enums: {
      skill_level: SkillLevel;
      play_format: PlayFormat;
      dominant_hand: DominantHand;
      swipe_direction: SwipeDirection;
    };
  };
};
