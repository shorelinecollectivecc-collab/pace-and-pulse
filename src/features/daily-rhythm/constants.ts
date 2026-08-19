import angryMood from "../../assets/moods/grumpy-emoji.png";
import confusedMood from "../../assets/moods/confused-emoji.png";
import coolMood from "../../assets/moods/cool-emoji.png";
import fireMood from "../../assets/moods/fire-emoji.png";
import happyTearsMood from "../../assets/moods/sincere-emoji.png";
import inLoveMood from "../../assets/moods/in-love-emoji.png";
import openMood from "../../assets/moods/hooray-emoji.png";
import playfulMood from "../../assets/moods/silly-emoji.png";
import shyMood from "../../assets/moods/shy-emoji.png";
import sickMood from "../../assets/moods/ill-emoji.png";
import tearfulMood from "../../assets/moods/cry-emoji.png";
import wowMood from "../../assets/moods/wow-emoji.png";
import type {
  AnnotationMilestone,
  MoodId,
  MovementType,
} from "./types";

export const annotationMilestones: AnnotationMilestone[] = [
  { count: 1, points: 5, title: "you started", message: "the first one is often the hardest" },
  { count: 3, points: 15, title: "momentum found", message: "three tracks done and your rhythm is waking up" },
  { count: 5, points: 25, title: "halfway glow", message: "five annotations deserve a proper little victory" },
  { count: 10, points: 60, title: "daily rhythm complete", message: "you reached today’s pace — genuinely well done" },
  { count: 15, points: 80, title: "extra-mile magic", message: "you went beyond the plan without losing your pace" },
  { count: 20, points: 120, title: "full rhythm day", message: "twenty tracks is a huge day — stop and notice it" },
  { count: 25, points: 150, title: "super day", message: "twenty-five tracks is powerful work — take a real pause" },
  { count: 30, points: 200, title: "super-duper day", message: "thirty tracks is enormous — celebrate and properly rest" },
];

export const timerPresets = [
  { label: "focus", minutes: 60 },
  { label: "deep work", minutes: 90 },
  { label: "flow", minutes: 120 },
];

export const moodOptions: Array<{ id: MoodId; label: string; image: string }> = [
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

export const movementOptions: Array<{ id: MovementType; label: string }> = [
  { id: "walk", label: "walk" },
  { id: "swim", label: "swim" },
  { id: "hanging-washing", label: "hang washing" },
  { id: "chores", label: "chores" },
  { id: "shower", label: "shower" },
  { id: "taking-out-trash", label: "take out trash" },
];

export const progressPhrases = [
  "you started · that matters more than perfection",
  "one step lighter · your brain can breathe",
  "look at you building momentum",
  "another small promise kept",
  "you are making today easier for yourself",
  "progress noticed · effort counted",
  "that was worth doing and you did it",
  "tiny win collected · keep your own pace",
  "you moved forward · even gently counts",
  "your rhythm is growing one check at a time",
  "done is enough · you do not need perfect",
  "you showed up for yourself again",
  "another thing is no longer waiting for you",
  "your effort is visible · give yourself credit",
  "steady progress is still real progress",
  "you made space in your head by doing that",
  "one more win belongs to you",
  "you are closer than you were a moment ago",
  "your pace is valid and it is working",
  "that check belongs there · well done",
  "you kept going · that deserves recognition",
  "your day is taking shape around you",
  "you did not have to do everything · just this",
  "another gentle win added to today",
  "you can pause and feel proud of that",
  "your future self just got a little help",
  "you are turning intention into something real",
  "this is what progress looks like for you",
  "you completed it · let that feel good",
  "one more piece settled into place",
];

export const routineGroups = [
  {
    title: "morning",
    items: [
      { id: "wake-up", label: "wake up", prompt: "what time did you get up?" },
      { id: "morning-pee", label: "pee", prompt: "first little win" },
      { id: "morning-drink", label: "morning drink", prompt: "what are you drinking?" },
      { id: "breakfast", label: "breakfast", prompt: "what did you have?" },
      { id: "brush-teeth", label: "brush teeth", prompt: "done is enough" },
      { id: "morning-meds", label: "meds & vitamins", prompt: "what did you take?" },
      { id: "get-dressed", label: "get dressed", prompt: "what feels comfortable?" },
      { id: "make-bed", label: "make bed", prompt: "tiny reset complete" },
      { id: "tidy-area", label: "tidy area", prompt: "which area?" },
    ],
  },
  {
    title: "afternoon",
    items: [
      { id: "chores", label: "do chores", prompt: "what needs doing?" },
      { id: "work-time", label: "work time", prompt: "what are you working on?" },
      { id: "lunch", label: "have lunch", prompt: "what did you eat?" },
      { id: "day-meds", label: "meds", prompt: "what did you take?" },
      { id: "focus", label: "focus", prompt: "what is the one focus?" },
    ],
  },
  {
    title: "evening",
    items: [
      { id: "make-dinner", label: "make dinner", prompt: "what are you making?" },
      { id: "evening-shower", label: "shower", prompt: "quick or everything shower?" },
      { id: "pack-away", label: "pack away", prompt: "what needs putting away?" },
      { id: "rest", label: "rest", prompt: "how do you want to rest?" },
      { id: "evening-meds", label: "meds", prompt: "what did you take?" },
      { id: "bedtime", label: "bedtime", prompt: "what time are you aiming for?" },
    ],
  },
];

export const optionalRoutineItems = [
  { id: "meeting", label: "meeting" },
  { id: "wash-hair", label: "wash hair" },
  { id: "shopping", label: "do shopping" },
  { id: "laundry", label: "do laundry" },
  { id: "appointment", label: "appointment" },
  { id: "errands", label: "run errands" },
  { id: "exercise", label: "exercise" },
  { id: "social-plans", label: "social plans" },
];
