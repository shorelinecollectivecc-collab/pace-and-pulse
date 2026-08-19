export type ActivePage =
  | "daily"
  | "video"
  | "goals"
  | "planner"
  | "progress"
  | "history"
  | "journal"
  | "brain"
  | "nudges"
  | "about"
  | "themes";

export type ThemeId =
  | "sand-sage"
  | "woodland-hush"
  | "moonlit-tide"
  | "rainy-window"
  | "coastal-stone"
  | "midnight-studio"
  | "paper-ink"
  | "quiet-meadow";

export type ThemeOption = {
  id: ThemeId;
  name: string;
  description: string;
  banner: string;
};

export type FontId =
  | "shadows-into-light"
  | "coming-soon"
  | "patrick-hand"
  | "schoolbell"
  | "sue-ellen-francisco"
  | "gloria-hallelujah"
  | "architects-daughter"
  | "just-another-hand";

export type FontOption = {
  id: FontId;
  name: string;
  family: string;
};

export type AnnotationMood =
  | "cool"
  | "energised"
  | "happy-tears"
  | "in-love"
  | "open"
  | "surprised"
  | "angry"
  | "tearful"
  | "confused"
  | "sick"
  | "shy"
  | "playful";

export type AnnotationRecord = {
  id: string;
  createdAt: string;
  dateKey: string;
  weekKey: string;
  monthKey: string;
  trackName: string;
  artist: string;
  spotifyId: string;
  trackDuration: string;
  mood: AnnotationMood | null;
  note: string;
  annotationMinutes: number;
  earningsUsd: number;
};

export type AnnotationDraft = {
  trackName: string;
  artist: string;
  spotifyId: string;
  trackDuration: string;
  mood: AnnotationMood | null;
  note: string;
  annotationMinutes: string;
};

export type NavigationItem = {
  id: ActivePage;
  name: string;
  short: string;
};
