import sandSage from "../assets/themes/sand-sage.png";
import woodlandHush from "../assets/themes/woodland-hush.png";
import moonlitTide from "../assets/themes/moonlit-tide.png";
import rainyWindow from "../assets/themes/rainy-window.png";
import coastalStone from "../assets/themes/coastal-stone.png";
import midnightStudio from "../assets/themes/midnight-studio.png";
import paperInk from "../assets/themes/paper-ink.png";
import quietMeadow from "../assets/themes/quiet-meadow.png";
import angryMood from "../assets/moods/grumpy-emoji.png";
import confusedMood from "../assets/moods/confused-emoji.png";
import coolMood from "../assets/moods/cool-emoji.png";
import fireMood from "../assets/moods/fire-emoji.png";
import happyTearsMood from "../assets/moods/sincere-emoji.png";
import inLoveMood from "../assets/moods/in-love-emoji.png";
import openMood from "../assets/moods/hooray-emoji.png";
import playfulMood from "../assets/moods/silly-emoji.png";
import shyMood from "../assets/moods/shy-emoji.png";
import sickMood from "../assets/moods/ill-emoji.png";
import tearfulMood from "../assets/moods/cry-emoji.png";
import wowMood from "../assets/moods/wow-emoji.png";
import type {
  AnnotationDraft,
  AnnotationMood,
  FontOption,
  NavigationItem,
  ThemeOption,
} from "../types/app";

export const USD_PER_ANNOTATION = 3.13;

export const themeOptions: ThemeOption[] = [
  {
    id: "sand-sage",
    name: "sand & sage",
    description: "earthy, warm and grounded",
    banner: sandSage,
  },
  {
    id: "woodland-hush",
    name: "woodland hush",
    description: "shaded, quiet and cocooning",
    banner: woodlandHush,
  },
  {
    id: "moonlit-tide",
    name: "moonlit tide",
    description: "nocturnal, spacious and reflective",
    banner: moonlitTide,
  },
  {
    id: "rainy-window",
    name: "rainy window",
    description: "cosy, dim and protected",
    banner: rainyWindow,
  },
  {
    id: "coastal-stone",
    name: "coastal stone",
    description: "weathered, airy and steady",
    banner: coastalStone,
  },
  {
    id: "midnight-studio",
    name: "midnight studio",
    description: "dark, musical and focused",
    banner: midnightStudio,
  },
  {
    id: "paper-ink",
    name: "paper & ink",
    description: "handmade, thoughtful and imperfect",
    banner: paperInk,
  },
  {
    id: "quiet-meadow",
    name: "quiet meadow",
    description: "open, gentle and softly hopeful",
    banner: quietMeadow,
  },
];

export const fontOptions: FontOption[] = [
  {
    id: "shadows-into-light",
    name: "shadows into light",
    family: '"Shadows Into Light", cursive',
  },
  {
    id: "coming-soon",
    name: "coming soon",
    family: '"Coming Soon", cursive',
  },
  {
    id: "patrick-hand",
    name: "patrick hand",
    family: '"Patrick Hand", cursive',
  },
  {
    id: "schoolbell",
    name: "schoolbell",
    family: '"Schoolbell", cursive',
  },
  {
    id: "sue-ellen-francisco",
    name: "sue ellen francisco",
    family: '"Sue Ellen Francisco", cursive',
  },
  {
    id: "gloria-hallelujah",
    name: "gloria hallelujah",
    family: '"Gloria Hallelujah", cursive',
  },
  {
    id: "architects-daughter",
    name: "architects daughter",
    family: '"Architects Daughter", cursive',
  },
  {
    id: "just-another-hand",
    name: "just another hand",
    family: '"Just Another Hand", cursive',
  },
];

export const annotationMoodOptions: Array<{
  id: AnnotationMood;
  label: string;
  image: string;
}> = [
  { id: "cool", label: "cool", image: coolMood },
  { id: "energised", label: "energised", image: fireMood },
  { id: "happy-tears", label: "happy tears", image: happyTearsMood },
  { id: "in-love", label: "in love", image: inLoveMood },
  { id: "open", label: "open", image: openMood },
  { id: "surprised", label: "surprised", image: wowMood },
  { id: "angry", label: "angry", image: angryMood },
  { id: "tearful", label: "tearful", image: tearfulMood },
  { id: "confused", label: "confused", image: confusedMood },
  { id: "sick", label: "sick", image: sickMood },
  { id: "shy", label: "shy", image: shyMood },
  { id: "playful", label: "playful", image: playfulMood },
];

export const emptyAnnotationDraft: AnnotationDraft = {
  trackName: "",
  artist: "",
  spotifyId: "",
  trackDuration: "",
  mood: null,
  note: "",
  annotationMinutes: "",
};

export const navigation: NavigationItem[] = [
  { id: "daily", name: "my daily rhythm", short: "d" },
  { id: "video", name: "my daily frame", short: "f" },
  { id: "goals", name: "my next steps", short: "n" },
  { id: "planner", name: "my work map", short: "m" },
  { id: "progress", name: "little wins", short: "w" },
  { id: "history", name: "my work trail", short: "t" },
  { id: "journal", name: "my little journal", short: "j" },
  { id: "brain", name: "brain teasers", short: "b" },
];
