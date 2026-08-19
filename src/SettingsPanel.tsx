import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAppSettings,
  type AppSettings,
} from "./AppSettingsContext";
import type { VideoAnnotationRecord } from "./VideoRhythmPage";
import {
  BONUS_VIDEO_HOURLY_RATE_USD,
  STANDARD_VIDEO_HOURLY_RATE_USD,
  formatVideoPayRate,
  getVideoRecordEarningsUsd,
} from "./utils/videoEarnings";
import {
  getWorkspaceItemCount,
  readWorkspaceBackupFile,
  restoreWorkspaceSnapshot,
  saveWorkspaceBackupFile,
} from "./workspaceData";
import {
  supabaseConfigured,
} from "./supabase";
import "./SettingsPanel.css";

type AnnotationRecord = {
  id: string;
  createdAt: string;
  dateKey: string;
  monthKey: string;
  trackName: string;
  artist: string;
  spotifyId: string;
  trackDuration: string;
  mood: string | null;
  note: string;
  annotationMinutes: number;
  earningsUsd: number;
};

type SettingsPanelProps = {
  annotations: AnnotationRecord[];
  videoAnnotations: VideoAnnotationRecord[];
  themeBanner: string;
  themeName: string;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const APP_VERSION = "1.1.0";

const targetOptions: AppSettings["dailyTarget"][] = [
  10, 15, 20, 25, 30,
];

function currentMonthKey() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export default function SettingsPanel({
  annotations,
  videoAnnotations,
  themeBanner,
  themeName,
}: SettingsPanelProps) {
  const {
    settings,
    updateSettings,
    languages,
    currencies,
    languageLoading,
    translationStatus,
    currencyStatus,
    requestNotifications,
    formatCurrency,
  } = useAppSettings();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [cloudUserEmail, setCloudUserEmail] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [exportMonth, setExportMonth] =
    useState(currentMonthKey);
  const [exportProject, setExportProject] =
    useState<"music" | "video">("music");
  const supportEmail = String(
    import.meta.env.VITE_SUPPORT_EMAIL ?? ""
  ).trim();
  const cloudConfigured =
    supabaseConfigured;
  const backgroundNudgesConfigured = Boolean(
    String(
      import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ""
    ).trim()
  );

  useEffect(() => {
    if (!cloudConfigured) {
      return;
    }

    let stopListening: () => void = () => {};
    let active = true;

    void import("./cloudSync").then(
      ({ getCloudUser, listenForCloudAuth }) => {
        if (!active) {
          return;
        }

        void getCloudUser().then((user) => {
          if (active) {
            setCloudUserEmail(user?.email ?? "");
          }
        });
        stopListening = listenForCloudAuth((_event, session) => {
          if (active) {
            setCloudUserEmail(session?.user.email ?? "");
          }
        });
      }
    );

    return () => {
      active = false;
      stopListening();
    };
  }, [cloudConfigured]);

  useEffect(() => {
    function captureInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }

    window.addEventListener(
      "beforeinstallprompt",
      captureInstallPrompt
    );

    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        captureInstallPrompt
      );
  }, []);

  useEffect(() => {
    function closeModal(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setAboutOpen(false);
      setPrivacyOpen(false);
      setSupportOpen(false);
      setResetOpen(false);
    }

    window.addEventListener("keydown", closeModal);
    return () => window.removeEventListener("keydown", closeModal);
  }, []);

  const monthOptions = useMemo(() => {
    return Array.from(
      new Set([
        currentMonthKey(),
        ...annotations.map((annotation) => annotation.monthKey),
        ...videoAnnotations.map(
          (annotation) => annotation.monthKey
        ),
      ])
    )
      .filter(Boolean)
      .sort()
      .reverse();
  }, [annotations, videoAnnotations]);

  const monthlyAnnotations = useMemo(
    () =>
      annotations.filter(
        (annotation) => annotation.monthKey === exportMonth
      ),
    [annotations, exportMonth]
  );
  const monthlyVideoAnnotations = useMemo(
    () =>
      videoAnnotations.filter(
        (annotation) =>
          annotation.monthKey === exportMonth
      ),
    [exportMonth, videoAnnotations]
  );

  const musicMonthTotalUsd = monthlyAnnotations.reduce(
    (total, annotation) =>
      total + Number(annotation.earningsUsd || 0),
    0
  );
  const videoMonthTotalUsd =
    monthlyVideoAnnotations.reduce(
      (total, annotation) =>
        total +
        getVideoRecordEarningsUsd(annotation),
      0
    );
  const monthTotalUsd =
    exportProject === "music"
      ? musicMonthTotalUsd
      : videoMonthTotalUsd;

  async function toggleNotifications(enabled: boolean) {
    const allowed = await requestNotifications(enabled);

    setNotice(
      enabled && !allowed
        ? "notifications are blocked in this browser"
        : enabled
          ? "notifications are ready"
          : "notifications are resting"
    );
  }

  async function restoreBackup() {
    if (!backupFile) {
      backupInputRef.current?.click();
      return;
    }

    try {
      const snapshot = await readWorkspaceBackupFile(backupFile);
      const itemCount = getWorkspaceItemCount(snapshot);
      const accepted = window.confirm(
        `restore ${itemCount} saved parts from this backup? your current workspace will be replaced.`
      );

      if (!accepted) {
        return;
      }

      restoreWorkspaceSnapshot(snapshot);
      window.location.reload();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message.toLowerCase()
          : "that backup could not be opened"
      );
    }
  }

  async function saveCloudBackup() {
    setCloudBusy(true);

    try {
      const { saveWorkspaceToCloud } = await import("./cloudSync");
      const snapshot = await saveWorkspaceToCloud();
      setNotice(
        `cloud copy saved · ${getWorkspaceItemCount(snapshot)} parts`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message.toLowerCase()
          : "the cloud copy could not be saved"
      );
    } finally {
      setCloudBusy(false);
    }
  }

  async function restoreCloudBackup() {
    const accepted = window.confirm(
      "restore your cloud copy? your current browser workspace will be replaced."
    );

    if (!accepted) {
      return;
    }

    setCloudBusy(true);

    try {
      const { loadWorkspaceFromCloud } = await import(
        "./cloudSync"
      );
      const snapshot = await loadWorkspaceFromCloud();
      restoreWorkspaceSnapshot(snapshot);
      window.location.reload();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message.toLowerCase()
          : "the cloud copy could not be restored"
      );
      setCloudBusy(false);
    }
  }

  function openTuneIn() {
    window.dispatchEvent(
      new Event("pace-pulse-open-auth")
    );
  }

  async function leaveCloudAccount() {
    setCloudBusy(true);

    try {
      const { signOutOfCloud } = await import("./cloudSync");
      await signOutOfCloud();
      setCloudUserEmail("");
      setNotice(
        "tuned out · your workspace is locked until you tune in again"
      );

      window.dispatchEvent(
        new Event("pace-pulse-open-auth")
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message.toLowerCase()
          : "tune out did not finish"
      );
    } finally {
      setCloudBusy(false);
    }
  }

  async function connectBackgroundNudges() {
    setCloudBusy(true);

    try {
      const { enableBackgroundNudges } = await import(
        "./pushSync"
      );
      await enableBackgroundNudges();
      setNotice(
        "background nudges are ready when the installed app is closed"
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message.toLowerCase()
          : "background nudges could not be connected"
      );
    } finally {
      setCloudBusy(false);
    }
  }

  async function installApp() {
    if (!installPrompt) {
      setNotice(
        "use your browser menu and choose install pace & pulse"
      );
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    setNotice(
      choice.outcome === "accepted"
        ? "pace & pulse is being installed"
        : "installation can wait"
    );
    setInstallPrompt(null);
  }

  function exportCsv() {
    const headings = [
      "annotation type",
      "date",
      "time",
      "name",
      "artist or video type",
      "spotify or video id",
      "content duration",
      "mood",
      "annotation minutes",
      "pay method",
      "pay rate",
      "note",
      "earned usd",
    ];
    const rows =
      exportProject === "music"
        ? monthlyAnnotations.map((annotation) => [
            "music",
            annotation.dateKey,
            new Date(
              annotation.createdAt
            ).toLocaleTimeString(),
            annotation.trackName,
            annotation.artist,
            annotation.spotifyId,
            annotation.trackDuration,
            annotation.mood ?? "",
            annotation.annotationMinutes,
            "",
            "",
            annotation.note,
            annotation.earningsUsd.toFixed(2),
          ])
        : monthlyVideoAnnotations.map((annotation) => [
        "video",
        annotation.dateKey,
        new Date(
          annotation.createdAt
        ).toLocaleTimeString(),
        annotation.contentId,
        annotation.videoType,
        annotation.contentId,
        annotation.videoDuration,
        annotation.mood ?? "",
        annotation.annotationMinutes,
        annotation.payMode ?? "per-hour",
        formatVideoPayRate(annotation),
        annotation.note,
        getVideoRecordEarningsUsd(
          annotation
        ).toFixed(2),
      ]);
    const csv = [headings, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    saveBlob(
      new Blob([csv], {
        type: "text/csv;charset=utf-8",
      }),
      `pace-pulse-${exportProject}-${exportMonth}.csv`
    );
    setNotice("your csv is ready");
  }

  function exportPdf() {
    const reportWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!reportWindow) {
      setNotice("allow pop-ups so the pdf can open");
      return;
    }

    const rows =
      exportProject === "music"
        ? monthlyAnnotations
      .map(
        (annotation) => `
          <tr>
            <td>music</td>
            <td>${escapeHtml(annotation.dateKey)}</td>
            <td>${escapeHtml(annotation.trackName)}</td>
            <td>${escapeHtml(annotation.artist)}</td>
            <td>${escapeHtml(annotation.annotationMinutes)} min</td>
            <td>${escapeHtml(annotation.mood ?? "—")}</td>
            <td>${escapeHtml(
              formatCurrency(annotation.earningsUsd)
            )}</td>
          </tr>`
      )
      .join("")
        : monthlyVideoAnnotations
        .map(
          (annotation) => `
          <tr>
            <td>video</td>
            <td>${escapeHtml(annotation.dateKey)}</td>
            <td>${escapeHtml(annotation.contentId || "—")}</td>
            <td>${escapeHtml(annotation.videoType)}</td>
            <td>${escapeHtml(annotation.annotationMinutes)} min</td>
            <td>${escapeHtml(annotation.mood ?? "—")}</td>
            <td>${escapeHtml(formatCurrency(getVideoRecordEarningsUsd(annotation)))}</td>
          </tr>`
        )
        .join("");

    reportWindow.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>pace & pulse · ${escapeHtml(exportMonth)}</title>
          <style>
            body { padding: 32px; color: #332b24; background: #f2eadc; font-family: sans-serif; }
            h1, h2, p { margin: 0 0 12px; }
            h1, h2 { font-weight: 500; }
            .summary { display: flex; gap: 24px; margin: 22px 0; }
            .summary div { padding: 12px 16px; border: 1px solid #9c8a72; border-radius: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 9px; border-bottom: 1px solid #c8baa7; text-align: left; }
            th { color: #4a7068; font-weight: 600; }
            @media print { body { background: white; } }
          </style>
        </head>
        <body>
          <h1>pace & pulse</h1>
          <p>${escapeHtml(exportProject)} annotation trail · ${escapeHtml(exportMonth)}</p>
          <div class="summary">
            <div>${
              exportProject === "music"
                ? monthlyAnnotations.length
                : monthlyVideoAnnotations.length
            } annotations</div>
            <div>${
              exportProject === "music"
                ? monthlyAnnotations.reduce(
                    (total, item) =>
                      total +
                      Number(item.annotationMinutes || 0),
                    0
                  )
                : monthlyVideoAnnotations.reduce(
                    (total, item) =>
                      total +
                      Number(item.annotationMinutes || 0),
                    0
                  )
            } minutes</div>
            <div>${
              escapeHtml(formatCurrency(monthTotalUsd))
            }</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>type</th>
                <th>date</th>
                <th>name</th>
                <th>artist or video type</th>
                <th>time</th>
                <th>mood</th>
                <th>earned</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="7">nothing logged for this month yet</td></tr>'}</tbody>
          </table>
          <script>window.addEventListener("load", () => window.print());</script>
        </body>
      </html>
    `);
    reportWindow.document.close();
    setNotice("choose save as pdf in the print window");
  }

  function resetApp() {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("pace-pulse"))
      .forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  }

  return (
    <>
      <section className="settings-panel">
        <div className="settings-panel-heading">
          <div>
            <p>the practical bits</p>
            <h3>shape the app around you</h3>
          </div>
          <span>{notice || "changes settle in automatically"}</span>
        </div>

        <div className="settings-grid">
          <article className="settings-card">
            <p>language & money</p>
            <h4>use what feels familiar</h4>

            <label>
              <span>language</span>
              <select
                data-no-translate
                value={settings.language}
                disabled={languageLoading}
                onChange={(event) =>
                  updateSettings({ language: event.target.value })
                }
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.name} · {language.nativeName}
                  </option>
                ))}
              </select>
              <small>
                {languageLoading
                  ? "finding available languages…"
                  : settings.language === "en"
                    ? "english is ready"
                    : translationStatus === "working"
                      ? "translating this page…"
                      : translationStatus === "error"
                        ? "translation needs the online service"
                        : "translation is ready"}
              </small>
            </label>

            <label>
              <span>currency</span>
              <select
                value={settings.currency}
                onChange={(event) =>
                  updateSettings({ currency: event.target.value })
                }
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code.toLowerCase()} · {currency.name} ·{" "}
                    {currency.symbol}
                  </option>
                ))}
              </select>
              <small>
                {currencyStatus === "working"
                  ? "checking today’s online rate…"
                  : currencyStatus === "error"
                    ? "this currency has no online rate yet"
                    : `monthly example · ${formatCurrency(
                        monthTotalUsd
                      )}`}
              </small>
            </label>
          </article>

          <article className="settings-card">
            <p>my pace</p>
            <h4>choose a daily music target</h4>

            <div className="target-options">
              {targetOptions.map((target) => (
                <button
                  key={target}
                  className={
                    settings.dailyTarget === target
                      ? "target-option target-option-selected"
                      : "target-option"
                  }
                  type="button"
                  aria-pressed={settings.dailyTarget === target}
                  onClick={() =>
                    updateSettings({ dailyTarget: target })
                  }
                >
                  <strong>{target}</strong>
                  <span>a day</span>
                </button>
              ))}
            </div>

            <small>
              this changes the goal on my daily rhythm
            </small>
          </article>

          <article className="settings-card">
            <p>my daily frame</p>
            <h4>shape the video annotation project</h4>

            <span className="settings-field-label">
              daily video target
            </span>

            <div className="target-options">
              {targetOptions.map((target) => (
                <button
                  key={target}
                  className={
                    settings.videoDailyTarget === target
                      ? "target-option target-option-selected"
                      : "target-option"
                  }
                  type="button"
                  aria-pressed={
                    settings.videoDailyTarget === target
                  }
                  onClick={() =>
                    updateSettings({
                      videoDailyTarget: target,
                    })
                  }
                >
                  <strong>{target}</strong>
                  <span>a day</span>
                </button>
              ))}
            </div>

            <div className="video-settings-rate">
              <span>video pay</span>
              <strong>
                default · ${STANDARD_VIDEO_HOURLY_RATE_USD} per hour
              </strong>
              <small>
                each video can be logged as per hour or per video ·
                ${BONUS_VIDEO_HOURLY_RATE_USD} per hour can still be used for bonus periods
              </small>
            </div>
          </article>

          <article className="settings-card">
            <p>gentle helpers</p>
            <h4>choose what works quietly</h4>

            <button
              className="setting-toggle"
              type="button"
              role="switch"
              aria-checked={settings.notificationsEnabled}
              onClick={() =>
                toggleNotifications(!settings.notificationsEnabled)
              }
            >
              <span>
                <strong>notifications</strong>
                <small>allow useful little nudges</small>
              </span>
              <i>{settings.notificationsEnabled ? "on" : "off"}</i>
            </button>

            <button
              className="setting-toggle"
              type="button"
              role="switch"
              aria-checked={settings.autoSaveEnabled}
              onClick={() =>
                updateSettings({
                  autoSaveEnabled: !settings.autoSaveEnabled,
                })
              }
            >
              <span>
                <strong>automatic saving</strong>
                <small>keep work between visits</small>
              </span>
              <i>{settings.autoSaveEnabled ? "on" : "off"}</i>
            </button>
          </article>

          <article className="settings-card settings-export-card">
            <p>take my work with me</p>
            <h4>export one job at a time</h4>

            <label>
              <span>annotation project</span>
              <select
                value={exportProject}
                onChange={(event) =>
                  setExportProject(
                    event.target.value as "music" | "video"
                  )
                }
              >
                <option value="music">
                  music annotation job
                </option>
                <option value="video">
                  video annotation job
                </option>
              </select>
            </label>

            <label>
              <span>month</span>
              <select
                value={exportMonth}
                onChange={(event) =>
                  setExportMonth(event.target.value)
                }
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </label>

            <div className="export-summary">
              <span>
                {exportProject === "music"
                  ? `${monthlyAnnotations.length} music annotations`
                  : `${monthlyVideoAnnotations.length} video annotations`}
              </span>
              <span>
                {formatCurrency(monthTotalUsd)}
              </span>
            </div>

            <div className="export-buttons">
              <button type="button" onClick={exportCsv}>
                export csv
              </button>
              <button type="button" onClick={exportPdf}>
                export pdf
              </button>
            </div>
          </article>

          <article className="settings-card settings-backup-card">
            <p>my whole workspace</p>
            <h4>keep a complete copy somewhere safe</h4>

            <span>
              this includes both annotation jobs, plans, routines,
              journal entries, wins, themes and profile details.
              spotify sign-in tokens are never included.
            </span>

            <input
              ref={backupInputRef}
              className="settings-hidden-file"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setBackupFile(file);
                setNotice(
                  file
                    ? `${file.name.toLowerCase()} is ready to restore`
                    : ""
                );
              }}
            />

            <div className="export-buttons">
              <button
                type="button"
                onClick={() => {
                  saveWorkspaceBackupFile();
                  setNotice("your complete backup is ready");
                }}
              >
                export full backup
              </button>
              <button type="button" onClick={restoreBackup}>
                {backupFile
                  ? "restore selected backup"
                  : "choose backup file"}
              </button>
            </div>
          </article>

          <article className="settings-card settings-cloud-card">
            <p>my pace &amp; pulse space</p>
            <h4>tune in, tune out &amp; carry your workspace</h4>

            {!cloudConfigured ? (
              <>
                <span>
                  tuning in is prepared and stays optional until the
                  public supabase values are added to the live app.
                </span>
                <small>your browser copy keeps working normally until account access is connected</small>
              </>
            ) : cloudUserEmail ? (
              <>
                <span>
                  tuned in as <strong>{cloudUserEmail}</strong>
                </span>
                <div className="settings-cloud-actions">
                  <button
                    type="button"
                    disabled={cloudBusy}
                    onClick={saveCloudBackup}
                  >
                    save to my space
                  </button>
                  <button
                    type="button"
                    disabled={cloudBusy}
                    onClick={restoreCloudBackup}
                  >
                    restore from my space
                  </button>
                  <button
                    type="button"
                    disabled={
                      cloudBusy || !backgroundNudgesConfigured
                    }
                    onClick={connectBackgroundNudges}
                  >
                    enable background nudges
                  </button>
                  <button
                    type="button"
                    disabled={cloudBusy}
                    onClick={leaveCloudAccount}
                  >
                    tune out
                  </button>
                </div>
                {!backgroundNudgesConfigured && (
                  <small>
                    background nudges will switch on after the live
                    push keys are added
                  </small>
                )}
              </>
            ) : (
              <>
                <span>
                  this workspace is currently tuned out. tune in with the
                  same email and password you created in the first-use setup.
                </span>

                <div className="settings-cloud-actions">
                  <button
                    className="settings-tune-in-button"
                    type="button"
                    onClick={openTuneIn}
                  >
                    tune in
                  </button>
                </div>

                <small>
                  tuning in unlocks your private workspace and reconnects
                  account sync on this device
                </small>
              </>
            )}
          </article>

          <article className="settings-card settings-install-card">
            <p>keep it close</p>
            <h4>install pace & pulse like an app</h4>
            <span>
              open it from your desktop or home screen while the
              browser safely handles updates.
            </span>
            <button type="button" onClick={installApp}>
              install pace & pulse
            </button>
          </article>

          <article className="settings-card settings-info-card">
            <p>pace & pulse</p>
            <h4>the details behind your workspace</h4>

            <button type="button" onClick={() => setAboutOpen(true)}>
              about the app
            </button>
            <button type="button" onClick={() => setPrivacyOpen(true)}>
              privacy & data
            </button>
            <button type="button" onClick={() => setSupportOpen(true)}>
              help & support
            </button>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent(
                    "pace-pulse-open-auth",
                    {
                      detail: {
                        screen: "welcome",
                      },
                    }
                  )
                );
              }}
            >
              show the welcome again
            </button>
            <button
              className="reset-open-button"
              type="button"
              onClick={() => setResetOpen(true)}
            >
              reset the app
            </button>
          </article>
        </div>
      </section>

      {aboutOpen && (
        <div
          className="settings-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAboutOpen(false);
            }
          }}
        >
          <section
            className="settings-modal about-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-app-title"
          >
            <button
              className="settings-modal-close"
              type="button"
              aria-label="close about the app"
              onClick={() => setAboutOpen(false)}
            >
              ×
            </button>

            <div className="about-banner">
              <img src={themeBanner} alt="" />
              <span className="about-banner-shade" />

              <img
                className="about-banner-mark"
                src="/icons/pace-pulse-logo.png"
                alt=""
                data-no-translate
              />

              <div className="about-banner-copy">
                <strong id="about-app-title" data-no-translate>
                  pace &amp; pulse
                </strong>
                <span>{themeName} · desktop edition · v{APP_VERSION}</span>
              </div>
            </div>

            <div className="about-modal-body">
              <div className="about-intro">
                <p>about the app</p>
                <h3>built for rhythm, not pressure</h3>
                <span>
                  a calm, audhd-friendly workspace that helps music and
                  video annotators work, care for themselves and notice
                  their progress without turning the day into another
                  demand.
                </span>
              </div>

              <div className="about-support-grid">
                <section>
                  <p>your work</p>
                  <strong>make progress visible</strong>
                  <span>
                    log annotations, time, earnings, goals and the small
                    steps that carried you through the day.
                  </span>
                </section>

                <section>
                  <p>your rhythm</p>
                  <strong>support the whole person</strong>
                  <span>
                    use gentle plans, body check-ins, movement, water,
                    routines, milestones and rewards at your own pace.
                  </span>
                </section>

                <section>
                  <p>your space</p>
                  <strong>make it feel like yours</strong>
                  <span>
                    choose themes, handwriting, language, currency and a
                    daily target that works with your brain.
                  </span>
                </section>
              </div>

              <div className="about-details-row">
                <dl>
                  <div>
                    <dt>version</dt>
                    <dd>{APP_VERSION}</dd>
                  </div>
                  <div>
                    <dt>developer</dt>
                    <dd>shoreline collective</dd>
                  </div>
                  <div>
                    <dt>made for</dt>
                    <dd>neurodivergent rhythms</dd>
                  </div>
                </dl>
              </div>

              <section className="about-release-notes">
                <div className="about-release-heading">
                  <div>
                    <p>what's new</p>
                    <h4>the polish update</h4>
                  </div>
                  <span>v{APP_VERSION}</span>
                </div>

                <div className="about-release-grid">
                  <div>
                    <span aria-hidden="true">⌁</span>
                    <p>
                      <strong>gentler startup</strong>
                      a calm pace &amp; pulse splash now carries you
                      into the workspace instead of dropping you
                      straight into the dashboard.
                    </p>
                  </div>

                  <div>
                    <span aria-hidden="true">☾</span>
                    <p>
                      <strong>safer tune out</strong>
                      tuning out now asks first, so an accidental click
                      cannot immediately close your private workspace.
                    </p>
                  </div>

                  <div>
                    <span aria-hidden="true">↟</span>
                    <p>
                      <strong>softer movement</strong>
                      navigation, dialogs and workspace changes now use
                      small, quiet transitions without making the app
                      feel busy.
                    </p>
                  </div>

                  <div>
                    <span aria-hidden="true">✎</span>
                    <p>
                      <strong>clearer release details</strong>
                      the about panel now keeps the current version and
                      release notes together in one place.
                    </p>
                  </div>
                </div>
              </section>

              <div className="about-privacy-note">
                <span aria-hidden="true">⌁</span>
                <p>
                  <strong>your data and connection</strong>
                  your saved workspace stays in this browser unless you
                  choose a full export or optional account sync.
                  internet is used for language translation, live
                  currency conversion, spotify and account features.
                </p>
              </div>

              <footer className="about-footer">
                <span>made slowly, thoughtfully and with real minds in mind</span>
                <span>© 2026 shoreline collective</span>
              </footer>
            </div>
          </section>
        </div>
      )}

      {privacyOpen && (
        <div
          className="settings-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPrivacyOpen(false);
            }
          }}
        >
          <section
            className="settings-modal settings-reading-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-title"
          >
            <button
              className="settings-modal-close"
              type="button"
              aria-label="close privacy and data"
              onClick={() => setPrivacyOpen(false)}
            >
              ×
            </button>
            <p>privacy & data</p>
            <h3 id="privacy-title">your workspace belongs to you</h3>

            <div className="settings-reading-copy">
              <section>
                <strong>saved in this browser</strong>
                <span>
                  without account sync, your annotations, routines,
                  journal, profile and settings stay in this browser’s
                  local storage.
                </span>
              </section>
              <section>
                <strong>optional online services</strong>
                <span>
                  translation, exchange rates and spotify need an
                  internet connection. account sync is optional and
                  only starts after you sign in.
                </span>
              </section>
              <section>
                <strong>safe exports</strong>
                <span>
                  full backups do not include spotify access tokens.
                  keep exported files somewhere private because they
                  can contain personal notes and work records.
                </span>
              </section>
              <section>
                <strong>your choices</strong>
                <span>
                  you can export your data, restore it, sign out of
                  sync or reset this browser copy from this page.
                </span>
              </section>
            </div>
          </section>
        </div>
      )}

      {supportOpen && (
        <div
          className="settings-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSupportOpen(false);
            }
          }}
        >
          <section
            className="settings-modal settings-reading-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-title"
          >
            <button
              className="settings-modal-close"
              type="button"
              aria-label="close help and support"
              onClick={() => setSupportOpen(false)}
            >
              ×
            </button>
            <p>help & support</p>
            <h3 id="support-title">one useful step at a time</h3>

            <div className="settings-reading-copy">
              <section>
                <strong>before changing anything</strong>
                <span>
                  export a full backup. it gives you a safe return
                  point for annotations, plans and personal notes.
                </span>
              </section>
              <section>
                <strong>when something looks stuck</strong>
                <span>
                  refresh once, check that the internet is connected,
                  then return to make it mine to confirm your settings.
                </span>
              </section>
              <section>
                <strong>when spotify needs help</strong>
                <span>
                  disconnect and reconnect the floating player. spotify
                  premium is required for playback inside the app.
                </span>
              </section>
            </div>

            {supportEmail ? (
              <a
                className="settings-support-link"
                href={`mailto:${supportEmail}`}
              >
                email shoreline collective
              </a>
            ) : (
              <small>
                the public support address will appear here when it is
                added to the live app settings.
              </small>
            )}
          </section>
        </div>
      )}

      {resetOpen && (
        <div
          className="settings-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setResetOpen(false);
            }
          }}
        >
          <section
            className="settings-modal reset-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-app-title"
          >
            <p>one careful pause</p>
            <h3 id="reset-app-title">reset the whole app?</h3>
            <p className="settings-about-copy">
              this removes annotations, plans, check-ins, wins,
              settings and saved choices from this browser.
            </p>
            <div className="reset-actions">
              <button type="button" onClick={() => setResetOpen(false)}>
                keep everything
              </button>
              <button
                className="reset-confirm-button"
                type="button"
                onClick={resetApp}
              >
                yes, reset it
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
