import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import sandSage from "./assets/themes/sand-sage.png";
import woodlandHush from "./assets/themes/woodland-hush.png";
import moonlitTide from "./assets/themes/moonlit-tide.png";
import rainyWindow from "./assets/themes/rainy-window.png";
import coastalStone from "./assets/themes/coastal-stone.png";
import midnightStudio from "./assets/themes/midnight-studio.png";
import paperInk from "./assets/themes/paper-ink.png";
import quietMeadow from "./assets/themes/quiet-meadow.png";
import angryMood from "./assets/moods/grumpy-emoji.png";
import confusedMood from "./assets/moods/confused-emoji.png";
import coolMood from "./assets/moods/cool-emoji.png";
import fireMood from "./assets/moods/fire-emoji.png";
import happyTearsMood from "./assets/moods/sincere-emoji.png";
import inLoveMood from "./assets/moods/in-love-emoji.png";
import openMood from "./assets/moods/hooray-emoji.png";
import playfulMood from "./assets/moods/silly-emoji.png";
import shyMood from "./assets/moods/shy-emoji.png";
import sickMood from "./assets/moods/ill-emoji.png";
import tearfulMood from "./assets/moods/cry-emoji.png";
import wowMood from "./assets/moods/wow-emoji.png";
import DailyRhythmTools from "./DailyRhythmTools";
import VideoRhythmPage, {
  loadVideoAnnotations,
  type VideoAnnotationRecord,
} from "./VideoRhythmPage";
import WorkTrailPage from "./WorkTrailPage";
import NextStepsPage from "./NextStepsPage";
import WorkMapPage from "./WorkMapPage";
import LittleWinsPage from "./LittleWinsPage";
import LittleJournalPage from "./LittleJournalPage";
import BrainStudioPage from "./BrainStudioPage";
import SpotifyFloatingPlayer, {
  type SpotifyAnnotationTrack,
} from "./SpotifyFloatingPlayer";
import LittleNudgesPage, {
  useLittleNudgesReminderEngine,
} from "./LittleNudgesPage";
import SettingsPanel from "./SettingsPanel";
import ProfilePage, {
  getSavedProfileSummary,
  type ProfileSummary,
} from "./ProfilePage";
import WelcomeOverlay from "./WelcomeOverlay";
import { supabase } from "./supabase";
import {
  AppSettingsProvider,
  useAppSettings,
} from "./AppSettingsContext";
import "./App.css";

const USD_PER_ANNOTATION = 3.13;
const STARTUP_SPLASH_MS = 1450;

type ActivePage =
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

type ThemeId =
  | "sand-sage"
  | "woodland-hush"
  | "moonlit-tide"
  | "rainy-window"
  | "coastal-stone"
  | "midnight-studio"
  | "paper-ink"
  | "quiet-meadow";

type ThemeOption = {
  id: ThemeId;
  name: string;
  description: string;
  banner: string;
};

type FontId =
  | "shadows-into-light"
  | "coming-soon"
  | "patrick-hand"
  | "schoolbell"
  | "sue-ellen-francisco"
  | "gloria-hallelujah"
  | "architects-daughter"
  | "just-another-hand";

type FontOption = {
  id: FontId;
  name: string;
  family: string;
};

type AnnotationMood =
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

type AnnotationRecord = {
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

type AnnotationDraft = {
  trackName: string;
  artist: string;
  spotifyId: string;
  trackDuration: string;
  mood: AnnotationMood | null;
  note: string;
  annotationMinutes: string;
};

const themeOptions: ThemeOption[] = [
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

const fontOptions: FontOption[] = [
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

const annotationMoodOptions: Array<{
  id: AnnotationMood;
  label: string;
  image: string;
}> = [
  { id: "cool", label: "cool", image: coolMood },
  { id: "energised", label: "energised", image: fireMood },
  {
    id: "happy-tears",
    label: "happy tears",
    image: happyTearsMood,
  },
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

const emptyAnnotationDraft: AnnotationDraft = {
  trackName: "",
  artist: "",
  spotifyId: "",
  trackDuration: "",
  mood: null,
  note: "",
  annotationMinutes: "",
};

const navigation = [
  { id: "daily", name: "my daily rhythm", short: "d" },
  { id: "video", name: "my daily frame", short: "f" },
  { id: "goals", name: "my next steps", short: "n" },
  { id: "planner", name: "my work map", short: "m" },
  { id: "progress", name: "little wins", short: "w" },
  { id: "history", name: "my work trail", short: "t" },
  { id: "journal", name: "my little journal", short: "j" },
  { id: "brain", name: "brain studio", short: "b" },
];

function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function getWeekKey(date: Date) {
  const workingDate = new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    )
  );
  const dayNumber = workingDate.getUTCDay() || 7;

  workingDate.setUTCDate(
    workingDate.getUTCDate() + 4 - dayNumber
  );

  const yearStart = new Date(
    Date.UTC(workingDate.getUTCFullYear(), 0, 1)
  );
  const weekNumber = Math.ceil(
    ((workingDate.getTime() - yearStart.getTime()) /
      86400000 +
      1) /
      7
  );

  return `${workingDate.getUTCFullYear()}-w${String(
    weekNumber
  ).padStart(2, "0")}`;
}

function getDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA").format(date);
}

function getMonthKey(date: Date) {
  return getDateKey(date).slice(0, 7);
}

function getSavedAnnotations(): AnnotationRecord[] {
  try {
    const saved = localStorage.getItem(
      "pace-pulse-annotation-log-all"
    );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved) as AnnotationRecord[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((annotation) => {
      const createdAt = new Date(annotation.createdAt);

      if (Number.isNaN(createdAt.getTime())) {
        return annotation;
      }

      return {
        ...annotation,
        dateKey: getDateKey(createdAt),
        weekKey: getWeekKey(createdAt),
        monthKey: getMonthKey(createdAt),
      };
    });
  } catch {
    return [];
  }
}

function getSavedTheme(): ThemeId {
  const savedTheme = localStorage.getItem("pace-pulse-theme");

  const validTheme = themeOptions.some(
    (theme) => theme.id === savedTheme
  );

  return validTheme ? (savedTheme as ThemeId) : "sand-sage";
}

function getSavedFont(): FontId {
  const savedFont = localStorage.getItem("pace-pulse-font");
  const validFont = fontOptions.some((font) => font.id === savedFont);

  return validFont
    ? (savedFont as FontId)
    : "shadows-into-light";
}

function AppContent() {
  const {
    settings,
    formatCurrency,
  } = useAppSettings();
  useLittleNudgesReminderEngine();
  const dailyGoal = settings.dailyTarget;
  const [annotations, setAnnotations] =
    useState<AnnotationRecord[]>(getSavedAnnotations);
  const [videoAnnotations, setVideoAnnotations] =
    useState<VideoAnnotationRecord[]>(
      loadVideoAnnotations
    );
  const [annotationModalOpen, setAnnotationModalOpen] =
    useState(false);
  const [annotationDraft, setAnnotationDraft] =
    useState<AnnotationDraft>(emptyAnnotationDraft);
  const [annotationError, setAnnotationError] = useState("");
  const [showUndo, setShowUndo] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      typeof window === "undefined" ||
      !window.matchMedia("(max-width: 900px)").matches
  );
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isTunedIn, setIsTunedIn] = useState(false);
  const [startupVisible, setStartupVisible] = useState(true);
  const [tuneOutConfirmOpen, setTuneOutConfirmOpen] =
    useState(false);
  const [activePage, setActivePage] =
    useState<ActivePage>("daily");
  const [activeTheme, setActiveTheme] =
    useState<ThemeId>(getSavedTheme);
  const [activeFont, setActiveFont] =
    useState<FontId>(getSavedFont);
  const [profileSummary, setProfileSummary] =
    useState<ProfileSummary>(getSavedProfileSummary);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setStartupVisible(false),
      STARTUP_SPLASH_MS
    );

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }

      setIsTunedIn(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsTunedIn(Boolean(session));
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  function tuneInFromProfile() {
    setProfileMenuOpen(false);

    window.dispatchEvent(
      new CustomEvent(
        "pace-pulse-open-auth",
        {
          detail: {
            screen: "signin",
          },
        }
      )
    );
  }

  async function tuneOutFromProfile() {
    setProfileMenuOpen(false);
    setTuneOutConfirmOpen(true);
  }

  async function confirmTuneOut() {
    setTuneOutConfirmOpen(false);

    await supabase.auth.signOut();

    window.dispatchEvent(
      new CustomEvent(
        "pace-pulse-open-auth",
        {
          detail: {
            screen: "signin",
          },
        }
      )
    );
  }

  const currentTheme =
    themeOptions.find((theme) => theme.id === activeTheme) ??
    themeOptions[0];
  const currentFont =
    fontOptions.find((font) => font.id === activeFont) ??
    fontOptions[0];

  const todayAnnotations = annotations.filter(
    (annotation) => annotation.dateKey === getTodayKey()
  );
  const annotationCount = todayAnnotations.length;

  const progress = Math.min(
    (annotationCount / dailyGoal) * 100,
    100
  );

  const usdEarnings = annotationCount * USD_PER_ANNOTATION;

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-ZA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
        .format(new Date())
        .toLowerCase(),
    []
  );

  const formattedEarnings = formatCurrency(usdEarnings);
  const formattedUsd = `$${usdEarnings.toFixed(2)}`.toLowerCase();

  useEffect(() => {
    if (!settings.autoSaveEnabled) {
      return;
    }

    const todayKey = getTodayKey();
    const now = new Date();
    const weekKey = getWeekKey(now);
    const monthKey = getMonthKey(now);

    localStorage.setItem(
      "pace-pulse-annotation-log-all",
      JSON.stringify(annotations)
    );
    localStorage.setItem(
      `pace-pulse-daily-log-${todayKey}`,
      JSON.stringify(
        annotations.filter(
          (annotation) => annotation.dateKey === todayKey
        )
      )
    );
    localStorage.setItem(
      `pace-pulse-weekly-log-${weekKey}`,
      JSON.stringify(
        annotations.filter(
          (annotation) => annotation.weekKey === weekKey
        )
      )
    );
    localStorage.setItem(
      `pace-pulse-monthly-log-${monthKey}`,
      JSON.stringify(
        annotations.filter(
          (annotation) => annotation.monthKey === monthKey
        )
      )
    );
    localStorage.setItem(
      `pace-pulse-count-${todayKey}`,
      String(annotationCount)
    );
  }, [
    annotations,
    annotationCount,
    settings.autoSaveEnabled,
  ]);

  useEffect(() => {
    if (settings.autoSaveEnabled) {
      localStorage.setItem("pace-pulse-theme", activeTheme);
    }
  }, [activeTheme, settings.autoSaveEnabled]);

  useEffect(() => {
    if (settings.autoSaveEnabled) {
      localStorage.setItem("pace-pulse-font", activeFont);
    }
  }, [activeFont, settings.autoSaveEnabled]);

  useEffect(() => {
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setAnnotationModalOpen(false);
      }
    }

    window.addEventListener("keydown", closeWithEscape);

    return () =>
      window.removeEventListener("keydown", closeWithEscape);
  }, []);

  function openAnnotationModal() {
    setAnnotationDraft(emptyAnnotationDraft);
    setAnnotationError("");
    setAnnotationModalOpen(true);
  }

  function closeAnnotationModal() {
    setAnnotationModalOpen(false);
    setAnnotationError("");
  }

  function useSpotifyTrackForAnnotation(
    track: SpotifyAnnotationTrack
  ) {
    const totalSeconds = Math.floor(track.durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    setAnnotationDraft({
      ...emptyAnnotationDraft,
      trackName: track.name,
      artist: track.artist,
      spotifyId: track.id,
      trackDuration: `${minutes}:${String(seconds).padStart(
        2,
        "0"
      )}`,
    });
    setAnnotationError("");
    setAnnotationModalOpen(true);
  }

  function updateAnnotationDraft<K extends keyof AnnotationDraft>(
    field: K,
    value: AnnotationDraft[K]
  ) {
    setAnnotationDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function saveAnnotation() {
    if (!annotationDraft.trackName.trim()) {
      setAnnotationError("add the track name first");
      return;
    }

    if (!annotationDraft.artist.trim()) {
      setAnnotationError("add the artist first");
      return;
    }

    const annotationMinutes = Number(
      annotationDraft.annotationMinutes
    );

    if (
      !Number.isFinite(annotationMinutes) ||
      annotationMinutes <= 0
    ) {
      setAnnotationError(
        "add how many minutes the annotation took"
      );
      return;
    }

    const now = new Date();
    const record: AnnotationRecord = {
      id:
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${now.getTime()}-${Math.random()}`,
      createdAt: now.toISOString(),
      dateKey: getDateKey(now),
      weekKey: getWeekKey(now),
      monthKey: getMonthKey(now),
      trackName: annotationDraft.trackName.trim(),
      artist: annotationDraft.artist.trim(),
      spotifyId: annotationDraft.spotifyId.trim(),
      trackDuration: annotationDraft.trackDuration.trim(),
      mood: annotationDraft.mood,
      note: annotationDraft.note.trim(),
      annotationMinutes,
      earningsUsd: USD_PER_ANNOTATION,
    };

    setAnnotations((current) => [...current, record]);

    if (
      settings.notificationsEnabled &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("pace & pulse", {
        body: `${annotationDraft.trackName.trim()} is safely logged · ${annotationCount + 1} of ${dailyGoal}`,
      });
    }
    setShowUndo(true);
    setAnnotationModalOpen(false);
    setAnnotationDraft(emptyAnnotationDraft);
    setAnnotationError("");
  }

  function undoLastAnnotation() {
    const lastTodayAnnotation = [...todayAnnotations].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )[0];

    if (!lastTodayAnnotation) {
      return;
    }

    setAnnotations((current) =>
      current.filter(
        (annotation) =>
          annotation.id !== lastTodayAnnotation.id
      )
    );

    setShowUndo(false);
  }

  function openPage(page: ActivePage) {
    setActivePage(page);
    setProfileMenuOpen(false);

    if (window.matchMedia("(max-width: 900px)").matches) {
      setSidebarOpen(false);
    }
  }

  function getProgressMessage() {
    if (annotationCount === 0) {
      return "start when you feel ready";
    }

    if (annotationCount < dailyGoal) {
      return `${dailyGoal - annotationCount} remaining today`;
    }

    if (annotationCount === dailyGoal) {
      return "today’s pace is complete";
    }

    return `${annotationCount - dailyGoal} beyond today’s pace`;
  }

  function renderBanner() {
    return (
      <section className="workspace-banner">
        <img src={currentTheme.banner} alt="" />

        <div className="workspace-banner-shade" />

        <div className="workspace-banner-copy">
          <p>{currentTheme.name}</p>
          <span>{currentTheme.description}</span>
        </div>
      </section>
    );
  }

  function renderDailyPage() {
    return (
      <>
        <header className="page-header">
          <h2>find your rhythm</h2>
          <time>{formattedDate}</time>
        </header>

        {renderBanner()}

        <section className="dashboard-grid">
          <article className="progress-card">
            <div className="card-heading">
              <div>
                <p>daily annotations</p>
                <h3>one track at a time</h3>
              </div>

              <span className="saving-status">
                <span />
                {settings.autoSaveEnabled
                  ? "saving automatically"
                  : "saving is paused"}
              </span>
            </div>

            <div className="count">
              <strong>{annotationCount}</strong>
              <span>/ {dailyGoal}</span>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-label="daily annotation progress"
              aria-valuemin={0}
              aria-valuemax={dailyGoal}
              aria-valuenow={annotationCount}
            >
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="progress-message">
              {getProgressMessage()}
            </p>

            <div className="annotation-actions">
              <button
                className="add-button"
                type="button"
                onClick={openAnnotationModal}
              >
                <span>+</span>
                add annotation
              </button>

              <div className="undo-space">
                {showUndo && annotationCount > 0 && (
                  <button
                    className="undo-button"
                    type="button"
                    onClick={undoLastAnnotation}
                  >
                    undo last
                  </button>
                )}
              </div>
            </div>
          </article>

          <article className="earnings-card">
            <div className="card-heading">
              <div>
                <p>today’s earnings</p>
                <h3>your work so far</h3>
              </div>
            </div>

            <div className="earnings-value">
              <strong>{formattedEarnings}</strong>
              {settings.currency !== "USD" && (
                <span>{formattedUsd}</span>
              )}
            </div>

            <div className="earnings-detail">
              <div>
                <span>completed</span>
                <strong>{annotationCount}</strong>
              </div>

              <div>
                <span>each annotation</span>
                <strong>$3.13</strong>
              </div>
            </div>

            <p className="earnings-note">
              your earnings update with every annotation
            </p>
          </article>
        </section>

        <DailyRhythmTools annotationCount={annotationCount} />
      </>
    );
  }

  function renderAboutPage() {
    return (
      <ProfilePage
        formattedDate={formattedDate}
        themeName={currentTheme.name}
        themeDescription={currentTheme.description}
        themeBanner={currentTheme.banner}
        onProfileChange={setProfileSummary}
      />
    );
  }

  function renderThemesPage() {
    return (
      <>
        <header className="page-header">
          <h2>make it mine</h2>
          <time>{formattedDate}</time>
        </header>

        <div className="personalisation-layout">
          <section className="themes-panel">
            <div className="themes-heading">
              <div>
                <p>workspace themes</p>
                <h3>choose what feels right today</h3>
              </div>

              <span>
                current · {currentTheme.name}
              </span>
            </div>

            <div className="theme-grid">
              {themeOptions.map((theme) => {
                const isSelected = theme.id === activeTheme;

                return (
                  <button
                    key={theme.id}
                    className={
                      isSelected
                        ? "theme-option theme-option-selected"
                        : "theme-option"
                    }
                    type="button"
                    data-theme-option={theme.id}
                    aria-pressed={isSelected}
                    onClick={() => setActiveTheme(theme.id)}
                  >
                    <img src={theme.banner} alt="" />

                    <span className="theme-option-shade" />

                    <span className="theme-option-copy">
                      <strong>{theme.name}</strong>
                      <small>{theme.description}</small>
                    </span>

                    {isSelected && (
                      <span className="chosen-label">
                        chosen
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="fonts-panel">
            <div className="fonts-heading">
              <div>
                <p>my writing</p>
                <h3>choose your handwriting</h3>
              </div>

              <span>current · {currentFont.name}</span>
            </div>

            <div className="font-grid">
              {fontOptions.map((font) => {
                const isSelected = font.id === activeFont;

                return (
                  <button
                    key={font.id}
                    className={
                      isSelected
                        ? "font-option font-option-selected"
                        : "font-option"
                    }
                    type="button"
                    aria-pressed={isSelected}
                    style={{ fontFamily: font.family }}
                    onClick={() => setActiveFont(font.id)}
                  >
                    <span>{font.name}</span>
                    {isSelected && <small>chosen</small>}
                  </button>
                );
              })}
            </div>
          </section>

          <SettingsPanel
            annotations={annotations}
            videoAnnotations={videoAnnotations}
            themeBanner={currentTheme.banner}
            themeName={currentTheme.name}
          />
        </div>
      </>
    );
  }

  function renderActivePage() {
    if (activePage === "about") {
      return renderAboutPage();
    }

    if (activePage === "themes") {
      return renderThemesPage();
    }

    if (activePage === "history") {
      return (
        <WorkTrailPage
          annotations={annotations}
          videoAnnotations={videoAnnotations}
        />
      );
    }

    if (activePage === "goals") {
      return (
        <NextStepsPage
          annotations={annotations}
          videoAnnotations={videoAnnotations}
        />
      );
    }

    if (activePage === "planner") {
      return <WorkMapPage />;
    }

    if (activePage === "progress") {
      return (
        <LittleWinsPage
          annotations={annotations}
          videoAnnotations={videoAnnotations}
        />
      );
    }

    if (activePage === "journal") {
      return (
        <LittleJournalPage
          formattedDate={formattedDate}
          themeName={currentTheme.name}
          themeDescription={currentTheme.description}
          themeBanner={currentTheme.banner}
        />
      );
    }

    if (activePage === "brain") {
      return (
        <BrainStudioPage
          formattedDate={formattedDate}
          themeName={currentTheme.name}
          themeDescription={currentTheme.description}
          themeBanner={currentTheme.banner}
        />
      );
    }

    if (activePage === "nudges") {
      return (
        <LittleNudgesPage
          formattedDate={formattedDate}
          themeName={currentTheme.name}
          themeDescription={currentTheme.description}
          themeBanner={currentTheme.banner}
        />
      );
    }

    if (activePage === "video") {
      return (
        <VideoRhythmPage
          formattedDate={formattedDate}
          themeName={currentTheme.name}
          themeDescription={currentTheme.description}
          themeBanner={currentTheme.banner}
          annotations={videoAnnotations}
          onAnnotationsChange={setVideoAnnotations}
        />
      );
    }

    return renderDailyPage();
  }

  function renderAnnotationModal() {
    if (!annotationModalOpen) {
      return null;
    }

    return (
      <div
        className="annotation-modal-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeAnnotationModal();
          }
        }}
      >
        <section
          className="annotation-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="annotation-modal-title"
        >
          <div className="annotation-modal-heading">
            <div>
              <p>one track at a time</p>
              <h2 id="annotation-modal-title">
                save this annotation
              </h2>
            </div>

            <button
              type="button"
              aria-label="close annotation form"
              onClick={closeAnnotationModal}
            >
              ×
            </button>
          </div>

          <div className="annotation-form-grid">
            <label>
              <span>track name</span>
              <input
                autoFocus
                value={annotationDraft.trackName}
                maxLength={120}
                placeholder="track name"
                onChange={(event) =>
                  updateAnnotationDraft(
                    "trackName",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>artist</span>
              <input
                value={annotationDraft.artist}
                maxLength={120}
                placeholder="artist name"
                onChange={(event) =>
                  updateAnnotationDraft(
                    "artist",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>spotify id</span>
              <input
                value={annotationDraft.spotifyId}
                maxLength={100}
                placeholder="spotify track id"
                onChange={(event) =>
                  updateAnnotationDraft(
                    "spotifyId",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>track duration</span>
              <input
                value={annotationDraft.trackDuration}
                maxLength={12}
                placeholder="for example · 3:42"
                onChange={(event) =>
                  updateAnnotationDraft(
                    "trackDuration",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="annotation-time-field">
              <span>annotation time</span>
              <div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={annotationDraft.annotationMinutes}
                  placeholder="minutes"
                  onChange={(event) =>
                    updateAnnotationDraft(
                      "annotationMinutes",
                      event.target.value
                    )
                  }
                />
                <span>minutes</span>
              </div>
            </label>
          </div>

          <fieldset className="annotation-mood-field">
            <legend>how did the track make you feel?</legend>

            <div className="annotation-mood-options">
              {annotationMoodOptions.map((mood) => {
                const selected =
                  annotationDraft.mood === mood.id;

                return (
                  <button
                    key={mood.id}
                    className={
                      selected
                        ? "annotation-mood-selected"
                        : ""
                    }
                    type="button"
                    aria-label={mood.label}
                    aria-pressed={selected}
                    title={mood.label}
                    onClick={() =>
                      updateAnnotationDraft("mood", mood.id)
                    }
                  >
                    <img src={mood.image} alt="" />
                    {selected && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="annotation-note-field">
            <span>small note</span>
            <textarea
              value={annotationDraft.note}
              maxLength={500}
              rows={3}
              placeholder="anything useful you want to remember"
              onChange={(event) =>
                updateAnnotationDraft(
                  "note",
                  event.target.value
                )
              }
            />
          </label>

          <div className="annotation-modal-footer">
            <p>{annotationError}</p>

            <div>
              <button
                className="annotation-cancel-button"
                type="button"
                onClick={closeAnnotationModal}
              >
                not yet
              </button>

              <button
                className="annotation-save-button"
                type="button"
                onClick={saveAnnotation}
              >
                save annotation
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      className={
        sidebarOpen
          ? "app-layout"
          : "app-layout sidebar-collapsed"
      }
      data-theme={activeTheme}
      data-font={activeFont}
      style={
        {
          "--display-font": currentFont.family,
        } as CSSProperties
      }
    >
      {startupVisible && (
        <div
          className="pace-splash"
          role="status"
          aria-live="polite"
          aria-label="pace and pulse is loading"
        >
          <div className="pace-splash-inner">
            <img
              src="/icons/pace-pulse-logo.png"
              alt=""
              className="pace-splash-logo"
            />

            <div className="pace-splash-copy">
              <small>shoreline collective</small>
              <strong>pace &amp; pulse</strong>
              <span>one small step at a time</span>
            </div>

            <div
              className="pace-splash-progress"
              aria-hidden="true"
            >
              <i />
            </div>

            <p>restoring your workspace...</p>
          </div>
        </div>
      )}

      <a className="skip-link" href="#main-workspace">
        skip to my workspace
      </a>
      <WelcomeOverlay />
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            {sidebarOpen ? (
              <>
                <h1>pace &amp; pulse</h1>
                <p>work in your own rhythm</p>
              </>
            ) : (
              <span>p&amp;p</span>
            )}
          </div>

          <button
            className="collapse-button"
            type="button"
            aria-label={
              sidebarOpen ? "collapse sidebar" : "open sidebar"
            }
            onClick={() =>
              setSidebarOpen((current) => !current)
            }
          >
            {sidebarOpen ? "‹" : "›"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const isAvailable =
              item.id === "daily" ||
              item.id === "video" ||
              item.id === "goals" ||
              item.id === "planner" ||
              item.id === "progress" ||
              item.id === "history" ||
              item.id === "journal" ||
              item.id === "brain";
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                className={
                  isActive
                    ? "nav-item nav-item-active"
                    : "nav-item"
                }
                type="button"
                disabled={!isAvailable}
                onClick={
                  isAvailable
                    ? () =>
                        openPage(
                          item.id === "history"
                            ? "history"
                            : item.id === "video"
                              ? "video"
                            : item.id === "planner"
                              ? "planner"
                            : item.id === "progress"
                              ? "progress"
                            : item.id === "goals"
                              ? "goals"
                            : item.id === "journal"
                              ? "journal"
                            : item.id === "brain"
                              ? "brain"
                            : "daily"
                        )
                    : undefined
                }
              >
                <span className="nav-mark" />

                {sidebarOpen ? (
                  <span>{item.name}</span>
                ) : (
                  <span className="nav-short">
                    {item.short}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="profile-area">
          {profileMenuOpen && (
            <div className="profile-menu">
              <div className="profile-menu-heading">
                <p>your space</p>

                <button
                  type="button"
                  aria-label="close user panel"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  ×
                </button>
              </div>

              <button
                className="profile-menu-item"
                type="button"
                onClick={() => openPage("about")}
              >
                <span />
                about me
              </button>

              <button
                className="profile-menu-item"
                type="button"
                onClick={() => openPage("themes")}
              >
                <span />
                make it mine
              </button>

              <button
                className="profile-menu-item"
                type="button"
                onClick={() => openPage("nudges")}
              >
                <span />
                little nudges
              </button>

              <div className="profile-menu-divider" />

              <button
                className="profile-menu-item profile-menu-auth"
                type="button"
                onClick={() => {
                  if (isTunedIn) {
                    void tuneOutFromProfile();
                    return;
                  }

                  tuneInFromProfile();
                }}
              >
                <span />
                {isTunedIn ? "tune out" : "tune in"}
              </button>
            </div>
          )}

          <button
            className={
              profileMenuOpen
                ? "profile-button profile-button-open"
                : "profile-button"
            }
            type="button"
            onClick={() =>
              setProfileMenuOpen((current) => !current)
            }
          >
            <span className="profile-circle">
              {profileSummary.profilePhoto ? (
                <img
                  src={profileSummary.profilePhoto}
                  alt=""
                />
              ) : (
                profileSummary.name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toLowerCase() || "y"
              )}
            </span>

            {sidebarOpen && (
              <span className="profile-copy">
                <strong>
                  {profileSummary.name || "your name"}
                </strong>
                <small>
                  {profileSummary.position || "your role"}
                </small>
              </span>
            )}

            {sidebarOpen && (
              <span className="profile-chevron">
                {profileMenuOpen ? "⌄" : "›"}
              </span>
            )}
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="mobile-sidebar-backdrop"
          type="button"
          aria-label="close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main
        id="main-workspace"
        className="main-content"
        tabIndex={-1}
        onClick={() => setProfileMenuOpen(false)}
      >
        {renderActivePage()}
      </main>

      {tuneOutConfirmOpen && (
        <div
          className="pace-confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setTuneOutConfirmOpen(false);
            }
          }}
        >
          <section
            className="pace-confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pace-tune-out-title"
          >
            <span
              className="pace-confirm-mark"
              aria-hidden="true"
            >
              ☾
            </span>

            <p>your space</p>

            <h2 id="pace-tune-out-title">
              ready to rest your workspace?
            </h2>

            <span className="pace-confirm-copy">
              your saved work stays where it is. you will need your
              email and password to tune back in.
            </span>

            <div className="pace-confirm-actions">
              <button
                type="button"
                onClick={() =>
                  setTuneOutConfirmOpen(false)
                }
              >
                stay here
              </button>

              <button
                className="pace-confirm-primary"
                type="button"
                onClick={() => {
                  void confirmTuneOut();
                }}
              >
                tune out
              </button>
            </div>
          </section>
        </div>
      )}

      <SpotifyFloatingPlayer
        onUseForAnnotation={useSpotifyTrackForAnnotation}
      />

      {renderAnnotationModal()}
    </div>
  );
}

export default function App() {
  return (
    <AppSettingsProvider>
      <AppContent />
    </AppSettingsProvider>
  );
}
