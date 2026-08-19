import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAppSettings } from "./AppSettingsContext";
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
import "./LittleJournalPage.css";

const JOURNAL_KEY = "pace-pulse-little-journal-entries";
const DRAFT_KEY = "pace-pulse-little-journal-draft";

type JournalKind =
  | "brain spill"
  | "daily reflection"
  | "work note"
  | "little win"
  | "remember tomorrow";

type MoodId =
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

type JournalEntry = {
  id: string;
  title: string;
  text: string;
  kind: JournalKind;
  mood: MoodId | null;
  helped: string;
  heavy: string;
  canWait: string;
  remember: string;
  nextStep: string;
  energy: number;
  brainWeather: BrainWeather | null;
  createdAt: string;
  updatedAt: string;
  dateKey: string;
  pinned: boolean;
};

type JournalDraft = {
  title: string;
  text: string;
  kind: JournalKind;
  mood: MoodId | null;
  helped: string;
  heavy: string;
  canWait: string;
  remember: string;
  nextStep: string;
  energy: number;
  brainWeather: BrainWeather | null;
};

type EntryFilter = "today" | "week" | "month" | "all";
type BrainWeather =
  | "quiet"
  | "foggy"
  | "scattered"
  | "stuck"
  | "focused"
  | "buzzing";

type LittleJournalPageProps = {
  formattedDate: string;
  themeName: string;
  themeDescription: string;
  themeBanner: string;
};

const emptyDraft: JournalDraft = {
  title: "",
  text: "",
  kind: "brain spill",
  mood: null,
  helped: "",
  heavy: "",
  canWait: "",
  remember: "",
  nextStep: "",
  energy: 3,
  brainWeather: null,
};

const journalKinds: Array<{
  id: JournalKind;
  prompts: string[];
}> = [
  {
    id: "brain spill",
    prompts: [
      "put down the thoughts making too much noise",
      "what keeps circling back into your head?",
      "write the untidy version first",
    ],
  },
  {
    id: "daily reflection",
    prompts: [
      "what did today actually feel like?",
      "what took more energy than expected?",
      "what part of today felt most like you?",
    ],
  },
  {
    id: "work note",
    prompts: [
      "leave a useful note about the work",
      "what worked well enough to use again?",
      "where did the work become difficult?",
    ],
  },
  {
    id: "little win",
    prompts: [
      "notice something that deserves to count",
      "what did you do even though it was difficult?",
      "what tiny thing moved forward?",
    ],
  },
  {
    id: "remember tomorrow",
    prompts: [
      "leave tomorrow one kind, useful clue",
      "what would make starting easier tomorrow?",
      "what does tomorrow not need to carry?",
    ],
  },
];

const brainWeatherOptions: BrainWeather[] = [
  "quiet",
  "foggy",
  "scattered",
  "stuck",
  "focused",
  "buzzing",
];

const moods: Array<{
  id: MoodId;
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

function getDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA").format(date);
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

  return `${workingDate.getUTCFullYear()}-${weekNumber}`;
}

function makeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function readEntries(): JournalEntry[] {
  try {
    const saved = localStorage.getItem(JOURNAL_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry.text === "string" &&
          entry.text.trim()
      )
      .map((entry) => ({
        id:
          typeof entry.id === "string"
            ? entry.id
            : makeId(),
        title:
          typeof entry.title === "string"
            ? entry.title
            : "",
        text: entry.text,
        kind: journalKinds.some(
          (kind) => kind.id === entry.kind
        )
          ? entry.kind
          : "brain spill",
        mood: moods.some(
          (mood) => mood.id === entry.mood
        )
          ? entry.mood
          : null,
        helped:
          typeof entry.helped === "string"
            ? entry.helped
            : "",
        heavy:
          typeof entry.heavy === "string"
            ? entry.heavy
            : "",
        canWait:
          typeof entry.canWait === "string"
            ? entry.canWait
            : "",
        remember:
          typeof entry.remember === "string"
            ? entry.remember
            : "",
        nextStep:
          typeof entry.nextStep === "string"
            ? entry.nextStep
            : "",
        energy:
          typeof entry.energy === "number"
            ? Math.min(5, Math.max(1, entry.energy))
            : 3,
        brainWeather: brainWeatherOptions.includes(
          entry.brainWeather
        )
          ? entry.brainWeather
          : null,
        createdAt:
          typeof entry.createdAt === "string"
            ? entry.createdAt
            : new Date().toISOString(),
        updatedAt:
          typeof entry.updatedAt === "string"
            ? entry.updatedAt
            : typeof entry.createdAt === "string"
              ? entry.createdAt
              : new Date().toISOString(),
        dateKey:
          typeof entry.dateKey === "string"
            ? entry.dateKey
            : getDateKey(new Date()),
        pinned: Boolean(entry.pinned),
      }));
  } catch {
    return [];
  }
}

function readDraft(): JournalDraft {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);

    if (!saved) {
      return emptyDraft;
    }

    const parsed = JSON.parse(saved) as Partial<JournalDraft>;

    return {
      ...emptyDraft,
      ...parsed,
      kind: journalKinds.some(
        (kind) => kind.id === parsed.kind
      )
        ? (parsed.kind as JournalKind)
        : "brain spill",
      mood: moods.some(
        (mood) => mood.id === parsed.mood
      )
        ? (parsed.mood as MoodId)
        : null,
      energy:
        typeof parsed.energy === "number"
          ? Math.min(5, Math.max(1, parsed.energy))
          : 3,
      brainWeather: brainWeatherOptions.includes(
        parsed.brainWeather as BrainWeather
      )
        ? (parsed.brainWeather as BrainWeather)
        : null,
    };
  } catch {
    return emptyDraft;
  }
}

function formatEntryDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .toLowerCase();
}

export default function LittleJournalPage({
  formattedDate,
  themeName,
  themeDescription,
  themeBanner,
}: LittleJournalPageProps) {
  const { settings } = useAppSettings();
  const [entries, setEntries] =
    useState<JournalEntry[]>(readEntries);
  const [draft, setDraft] =
    useState<JournalDraft>(readDraft);
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [filter, setFilter] =
    useState<EntryFilter>("today");
  const [searchText, setSearchText] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [savedMessage, setSavedMessage] =
    useState("your draft is held gently");
  const today = new Date();
  const todayKey = getDateKey(today);
  const weekKey = getWeekKey(today);
  const monthKey = todayKey.slice(0, 7);

  useEffect(() => {
    if (!settings.autoSaveEnabled) {
      setSavedMessage("autosave is resting");
      return;
    }

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setSavedMessage("your draft is held gently");
  }, [draft, settings.autoSaveEnabled]);

  useEffect(() => {
    if (!settings.autoSaveEnabled) {
      return;
    }

    localStorage.setItem(
      JOURNAL_KEY,
      JSON.stringify(entries)
    );
  }, [entries, settings.autoSaveEnabled]);

  const visibleEntries = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return [...entries]
      .filter((entry) => {
        const created = new Date(
          `${entry.dateKey}T12:00:00`
        );
        const matchesRange =
          filter === "all" ||
          (filter === "today" &&
            entry.dateKey === todayKey) ||
          (filter === "week" &&
            getWeekKey(created) === weekKey) ||
          (filter === "month" &&
            entry.dateKey.startsWith(monthKey));

        if (!matchesRange) {
          return false;
        }

        if (!search) {
          return true;
        }

        return [
          entry.title,
          entry.text,
          entry.kind,
          entry.helped,
          entry.heavy,
          entry.canWait,
          entry.remember,
          entry.nextStep,
          entry.brainWeather ?? "",
        ].some((value) =>
          value.toLowerCase().includes(search)
        );
      })
      .sort((first, second) => {
        if (first.pinned !== second.pinned) {
          return first.pinned ? -1 : 1;
        }

        return (
          new Date(second.updatedAt).getTime() -
          new Date(first.updatedAt).getTime()
        );
      });
  }, [
    entries,
    filter,
    monthKey,
    searchText,
    todayKey,
    weekKey,
  ]);

  const todayCount = entries.filter(
    (entry) => entry.dateKey === todayKey
  ).length;
  const pinnedCount = entries.filter(
    (entry) => entry.pinned
  ).length;
  const selectedKind =
    journalKinds.find((kind) => kind.id === draft.kind) ??
    journalKinds[0];
  const selectedPrompt =
    selectedKind.prompts[
      promptIndex % selectedKind.prompts.length
    ];

  function updateDraft(change: Partial<JournalDraft>) {
    setDraft((current) => ({
      ...current,
      ...change,
    }));
  }

  function clearDraft() {
    setDraft(emptyDraft);
    setEditingId(null);
    setSavedMessage("a fresh page is ready");
  }

  function saveEntry() {
    const text = draft.text.trim();

    if (!text) {
      setSavedMessage("write one small thing first");
      return;
    }

    const now = new Date();

    if (editingId) {
      setEntries((current) =>
        current.map((entry) =>
          entry.id === editingId
            ? {
                ...entry,
                ...draft,
                title: draft.title.trim(),
                text,
                updatedAt: now.toISOString(),
              }
            : entry
        )
      );
      setSavedMessage("your note was updated");
    } else {
      setEntries((current) => [
        {
          id: makeId(),
          ...draft,
          title: draft.title.trim(),
          text,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          dateKey: getDateKey(now),
          pinned: false,
        },
        ...current,
      ]);
      setSavedMessage("your note is safely here");
    }

    setDraft(emptyDraft);
    setEditingId(null);
  }

  function openEntry(entry: JournalEntry) {
    setDraft({
      title: entry.title,
      text: entry.text,
      kind: entry.kind,
      mood: entry.mood,
      helped: entry.helped,
      heavy: entry.heavy,
      canWait: entry.canWait,
      remember: entry.remember,
      nextStep: entry.nextStep,
      energy: entry.energy,
      brainWeather: entry.brainWeather,
    });
    setEditingId(entry.id);
    setSavedMessage("editing this note");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function togglePinned(entryId: string) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? { ...entry, pinned: !entry.pinned }
          : entry
      )
    );
  }

  function deleteEntry(entryId: string) {
    setEntries((current) =>
      current.filter((entry) => entry.id !== entryId)
    );

    if (editingId === entryId) {
      clearDraft();
    }
  }

  return (
    <section className="little-journal-page">
      <header className="little-journal-header">
        <div>
          <p>my little journal</p>
          <h2>a quiet place to leave the day</h2>
        </div>

        <span>{savedMessage}</span>
        <time>{formattedDate}</time>
      </header>

      <section
        className="little-journal-banner"
        style={{ backgroundImage: `url(${themeBanner})` }}
      >
        <div>
          <p>{themeName}</p>
          <span>{themeDescription}</span>
        </div>
      </section>

      <section className="journal-summary">
        <div>
          <p>today’s pages</p>
          <strong>{todayCount}</strong>
          <span>there is no required amount</span>
        </div>
        <div>
          <p>all little notes</p>
          <strong>{entries.length}</strong>
          <span>each thought found somewhere to land</span>
        </div>
        <div>
          <p>kept close</p>
          <strong>{pinnedCount}</strong>
          <span>the notes you want nearby</span>
        </div>
        <blockquote>
          you do not need to explain everything perfectly.
          fragments, lists and unfinished thoughts belong here too.
        </blockquote>
      </section>

      <section className="journal-compose-card">
        <div className="journal-section-heading">
          <div>
            <p>
              {editingId
                ? "editing a little note"
                : "a page for right now"}
            </p>
            <h3>
              {editingId
                ? "change only what needs changing"
                : "write it before it disappears"}
            </h3>
          </div>
          <span>{draft.text.length} / 1200</span>
        </div>

        <div className="journal-mood-section">
          <p>how does this moment feel?</p>
          <div className="journal-moods">
            {moods.map((mood) => (
              <button
                key={mood.id}
                className={
                  draft.mood === mood.id
                    ? "journal-mood journal-mood-selected"
                    : "journal-mood"
                }
                type="button"
                aria-label={mood.label}
                aria-pressed={draft.mood === mood.id}
                title={mood.label}
                onClick={() =>
                  updateDraft({
                    mood:
                      draft.mood === mood.id
                        ? null
                        : mood.id,
                  })
                }
              >
                <img src={mood.image} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="journal-state-strip">
          <label className="journal-energy">
            <span>
              energy right now · {draft.energy} / 5
            </span>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={draft.energy}
              onChange={(event) =>
                updateDraft({
                  energy: Number(event.target.value),
                })
              }
            />
            <small>
              <span>very low</span>
              <span>in between</span>
              <span>very high</span>
            </small>
          </label>

          <div className="journal-brain-weather">
            <span>my brain feels</span>
            <div>
              {brainWeatherOptions.map((weather) => (
                <button
                  key={weather}
                  className={
                    draft.brainWeather === weather
                      ? "selected"
                      : ""
                  }
                  type="button"
                  aria-pressed={
                    draft.brainWeather === weather
                  }
                  onClick={() =>
                    updateDraft({
                      brainWeather:
                        draft.brainWeather === weather
                          ? null
                          : weather,
                    })
                  }
                >
                  {weather}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="journal-kind-options">
          {journalKinds.map((kind) => (
            <button
              key={kind.id}
              className={
                draft.kind === kind.id
                  ? "journal-kind-selected"
                  : ""
              }
              type="button"
              aria-pressed={draft.kind === kind.id}
              onClick={() =>
                {
                  updateDraft({ kind: kind.id });
                  setPromptIndex(0);
                }
              }
            >
              {kind.id}
            </button>
          ))}
        </div>

        <div className="journal-writing-prompt">
          <p>{selectedPrompt}</p>
          <button
            type="button"
            onClick={() =>
              setPromptIndex((current) => current + 1)
            }
          >
            another gentle prompt
          </button>
        </div>

        <input
          className="journal-title-input"
          type="text"
          value={draft.title}
          maxLength={100}
          placeholder="a tiny title, if you want one"
          onChange={(event) =>
            updateDraft({ title: event.target.value })
          }
        />

        <textarea
          className="journal-main-textarea"
          rows={8}
          maxLength={1200}
          value={draft.text}
          placeholder="write it messily. it only needs to make sense to you."
          onChange={(event) =>
            updateDraft({ text: event.target.value })
          }
        />

        <div className="journal-gentle-details">
          <label>
            <span>what helped a little?</span>
            <input
              value={draft.helped}
              placeholder="music, quiet, food, a person..."
              onChange={(event) =>
                updateDraft({ helped: event.target.value })
              }
            />
          </label>
          <label>
            <span>what felt heavy?</span>
            <input
              value={draft.heavy}
              placeholder="name it without fixing it"
              onChange={(event) =>
                updateDraft({ heavy: event.target.value })
              }
            />
          </label>
          <label>
            <span>what can wait?</span>
            <input
              value={draft.canWait}
              placeholder="not everything belongs to today"
              onChange={(event) =>
                updateDraft({ canWait: event.target.value })
              }
            />
          </label>
        </div>

        <div className="journal-memory-details">
          <label>
            <span>one thing i want to remember</span>
            <input
              value={draft.remember}
              placeholder="a detail, feeling, idea or moment"
              onChange={(event) =>
                updateDraft({ remember: event.target.value })
              }
            />
          </label>
          <label>
            <span>my next tiny step</span>
            <input
              value={draft.nextStep}
              placeholder="small enough to begin without a fight"
              onChange={(event) =>
                updateDraft({ nextStep: event.target.value })
              }
            />
          </label>
        </div>

        <div className="journal-compose-actions">
          <button type="button" onClick={clearDraft}>
            clear the page
          </button>
          <button type="button" onClick={saveEntry}>
            {editingId ? "save changes" : "keep this note"}
          </button>
        </div>
      </section>

      <section className="journal-entries-card">
        <div className="journal-library-heading">
          <div>
            <p>what i left here</p>
            <h3>my saved little notes</h3>
          </div>

          <label>
            <span>find a thought</span>
            <input
              type="search"
              value={searchText}
              placeholder="search my journal"
              onChange={(event) =>
                setSearchText(event.target.value)
              }
            />
          </label>
        </div>

        <div className="journal-entry-filter">
          {(
            [
              ["today", "today"],
              ["week", "this week"],
              ["month", "this month"],
              ["all", "all notes"],
            ] as Array<[EntryFilter, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              className={filter === id ? "active" : ""}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {visibleEntries.length === 0 ? (
          <div className="journal-empty-state">
            <span>·</span>
            <p>nothing is waiting here yet</p>
            <small>
              one sentence, three words or a list is enough
            </small>
          </div>
        ) : (
          <div className="journal-entry-grid">
            {visibleEntries.map((entry) => {
              const mood = moods.find(
                (item) => item.id === entry.mood
              );

              return (
                <article
                  key={entry.id}
                  className={
                    entry.pinned
                      ? "journal-entry journal-entry-pinned"
                      : "journal-entry"
                  }
                >
                  <header>
                    <div>
                      {mood && (
                        <img src={mood.image} alt="" />
                      )}
                      <span>{entry.kind}</span>
                    </div>
                    <time>
                      {formatEntryDate(entry.createdAt)}
                    </time>
                  </header>

                  {entry.title && <h4>{entry.title}</h4>}
                  <p>{entry.text}</p>

                  {(entry.helped ||
                    entry.heavy ||
                    entry.canWait ||
                    entry.remember ||
                    entry.nextStep ||
                    entry.brainWeather ||
                    entry.energy) && (
                    <dl>
                      {entry.helped && (
                        <div>
                          <dt>helped</dt>
                          <dd>{entry.helped}</dd>
                        </div>
                      )}
                      <div>
                        <dt>energy</dt>
                        <dd>{entry.energy} / 5</dd>
                      </div>
                      {entry.brainWeather && (
                        <div>
                          <dt>brain</dt>
                          <dd>{entry.brainWeather}</dd>
                        </div>
                      )}
                      {entry.remember && (
                        <div>
                          <dt>remember</dt>
                          <dd>{entry.remember}</dd>
                        </div>
                      )}
                      {entry.nextStep && (
                        <div>
                          <dt>next step</dt>
                          <dd>{entry.nextStep}</dd>
                        </div>
                      )}
                      {entry.heavy && (
                        <div>
                          <dt>felt heavy</dt>
                          <dd>{entry.heavy}</dd>
                        </div>
                      )}
                      {entry.canWait && (
                        <div>
                          <dt>can wait</dt>
                          <dd>{entry.canWait}</dd>
                        </div>
                      )}
                    </dl>
                  )}

                  <footer>
                    <button
                      type="button"
                      onClick={() => openEntry(entry)}
                    >
                      open note
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePinned(entry.id)}
                    >
                      {entry.pinned ? "unpin" : "keep close"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEntry(entry.id)}
                    >
                      let it go
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
