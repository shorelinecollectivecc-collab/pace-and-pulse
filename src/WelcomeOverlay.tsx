import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";
import "./WelcomeOverlay.css";

type Screen =
  | "welcome"
  | "choice"
  | "signup"
  | "signin"
  | "forgot"
  | "check-email"
  | "onboarding"
  | "ready";

type OnboardingData = {
  preferredName: string;
  platform: string;
  currency: string;
  annotationRate: string;
  dailyGoal: string;
  weeklyGoal: string;
  monthlyGoal: string;
  theme: string;
  accent: string;
  font: string;
  clockFormat: string;
  dateFormat: string;
};

const WELCOME_KEY = "pace-pulse-welcome-complete";
const LAST_EMAIL_KEY = "pace-pulse-last-email";

const welcomeSteps = [
  {
    eyebrow: "welcome to pace & pulse",
    title: "your work can have a gentler shape",
    copy: "music and video annotation stay separate, while your routines, body check-ins, little wins and breaks stay close by.",
  },
  {
    eyebrow: "your pace",
    title: "minutes, small steps and no pressure",
    copy: "choose a theme, handwriting, language and targets that make the workspace easier for your brain to return to.",
  },
  {
    eyebrow: "your space",
    title: "keep your rhythm with you",
    copy: "create a private, password-protected space so your workspace can recognise you when you return.",
  },
];

const themes = [
  ["sand-sage", "sand & sage"],
  ["woodland-hush", "woodland hush"],
  ["moonlit-tide", "moonlit tide"],
  ["rainy-window", "rainy window"],
  ["coastal-stone", "coastal stone"],
  ["midnight-studio", "midnight studio"],
  ["paper-ink", "paper & ink"],
  ["quiet-meadow", "quiet meadow"],
];

const fonts = [
  ["shadows-into-light", "shadows into light"],
  ["coming-soon", "coming soon"],
  ["patrick-hand", "patrick hand"],
  ["schoolbell", "schoolbell"],
  ["sue-ellen-francisco", "sue ellen francisco"],
  ["gloria-hallelujah", "gloria hallelujah"],
  ["architects-daughter", "architects daughter"],
  ["just-another-hand", "just another hand"],
] as const;

const accents = [
  ["sage", "sage"],
  ["old-gold", "old gold"],
  ["clay", "warm clay"],
  ["ocean", "soft ocean"],
];

const initialOnboarding: OnboardingData = {
  preferredName: "",
  platform: "",
  currency: "ZAR",
  annotationRate: "3.13",
  dailyGoal: "20",
  weeklyGoal: "140",
  monthlyGoal: "560",
  theme: "sand-sage",
  accent: "old-gold",
  font: "shadows-into-light",
  clockFormat: "24",
  dateFormat: "DD/MM/YYYY",
};

function normaliseEmail(value: string) {
  return value.trim().toLowerCase();
}

function hintKey(value: string) {
  return `pace-pulse-password-hint:${normaliseEmail(value)}`;
}

function pinKey(value: string) {
  return `pace-pulse-pin:${normaliseEmail(value)}`;
}

async function hashPin(pin: string) {
  const bytes = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}


export default function WelcomeOverlay() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [screen, setScreen] = useState<Screen>(() =>
    localStorage.getItem(WELCOME_KEY) === "yes" ? "choice" : "welcome"
  );
  const [step, setStep] = useState(0);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState(
    () => localStorage.getItem(LAST_EMAIL_KEY) ?? ""
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordHint, setPasswordHint] = useState("");
  const [pin, setPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [forcedOpen, setForcedOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [onboarding, setOnboarding] =
    useState<OnboardingData>(initialOnboarding);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionReady(true);
      setProfileReady(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function openAuth(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<{
          screen?: "signin" | "welcome";
        }>;

      const requestedScreen =
        customEvent.detail?.screen ??
        "signin";

      setMessage("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);

      if (requestedScreen === "welcome") {
        setForcedOpen(true);
        setStep(0);
        setScreen("welcome");
        return;
      }

      localStorage.setItem(
        WELCOME_KEY,
        "yes"
      );
      setForcedOpen(true);
      setStep(
        welcomeSteps.length - 1
      );
      setScreen("signin");
    }

    window.addEventListener(
      "pace-pulse-open-auth",
      openAuth
    );

    return () =>
      window.removeEventListener(
        "pace-pulse-open-auth",
        openAuth
      );
  }, []);

  useEffect(() => {
    if (!session) {
      setProfileReady(true);
      return;
    }

    const activeSession = session;
    let active = true;

    async function loadProfile() {
      const metadata =
        activeSession.user.user_metadata ?? {};

      const metadataPreferences =
        metadata.pace_pulse_preferences as
          | Partial<OnboardingData>
          | undefined;

      if (
        metadata.pace_pulse_onboarding_complete === true &&
        metadataPreferences
      ) {
        const savedPreferences: OnboardingData = {
          ...initialOnboarding,
          ...metadataPreferences,
          preferredName:
            String(
              metadataPreferences.preferredName ??
                metadata.preferred_name ??
                ""
            ),
        };

        applyWorkspacePreferences(
          savedPreferences
        );
        setOnboarding(savedPreferences);
        setProfileReady(true);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "preferred_name, avatar_url, onboarding_complete, platform, currency, annotation_rate, daily_goal, weekly_goal, monthly_goal, theme, accent, font, clock_format, date_format"
        )
        .eq("id", activeSession.user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        const next = {
          ...initialOnboarding,
          preferredName:
            String(
              activeSession.user.user_metadata
                ?.preferred_name ?? ""
            ),
        };

        setOnboarding(next);
        setOnboardingStep(0);
        setMessage("");
        setScreen("onboarding");
        setProfileReady(true);
        return;
      }

      if (data?.onboarding_complete) {
        applyWorkspacePreferences({
          preferredName: data.preferred_name ?? "",
          platform: data.platform ?? "",
          currency: data.currency ?? "ZAR",
          annotationRate: String(data.annotation_rate ?? "3.13"),
          dailyGoal: String(data.daily_goal ?? "20"),
          weeklyGoal: String(data.weekly_goal ?? "140"),
          monthlyGoal: String(data.monthly_goal ?? "560"),
          theme: data.theme ?? "sand-sage",
          accent: data.accent ?? "old-gold",
          font: data.font ?? "shadows-into-light",
          clockFormat: data.clock_format ?? "24",
          dateFormat: data.date_format ?? "DD/MM/YYYY",
        });
        setProfileReady(true);
        return;
      }

      const next = {
        ...initialOnboarding,
        preferredName:
          data?.preferred_name ||
          String(activeSession.user.user_metadata?.preferred_name ?? ""),
      };

      setOnboarding(next);
      setOnboardingStep(0);
      setScreen("onboarding");
      setProfileReady(true);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [session]);

  const savedHint = useMemo(() => {
    if (!email.trim()) return "";
    return localStorage.getItem(hintKey(email)) ?? "";
  }, [email, showHint]);

  function updateOnboarding<K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K]
  ) {
    setOnboarding((current) => ({ ...current, [key]: value }));
  }

  function applyWorkspacePreferences(data: OnboardingData) {
    localStorage.setItem("pace-pulse-theme", data.theme);
    localStorage.setItem("pace-pulse-font", data.font);
    localStorage.setItem("pace-pulse-accent", data.accent);
    localStorage.setItem("pace-pulse-platform", data.platform);
    localStorage.setItem("pace-pulse-currency", data.currency);
    localStorage.setItem("pace-pulse-annotation-rate", data.annotationRate);
    localStorage.setItem("pace-pulse-daily-goal", data.dailyGoal);
    localStorage.setItem("pace-pulse-weekly-goal", data.weeklyGoal);
    localStorage.setItem("pace-pulse-monthly-goal", data.monthlyGoal);
    localStorage.setItem("pace-pulse-clock-format", data.clockFormat);
    localStorage.setItem("pace-pulse-date-format", data.dateFormat);
    localStorage.setItem("pace-pulse-profile-name", data.preferredName);
  }

  function resetForm(nextScreen: Screen) {
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    setPin("");
    setShowPassword(false);
    setShowHint(false);
    setScreen(nextScreen);
  }

  function finishWelcome() {
    localStorage.setItem(WELCOME_KEY, "yes");
    setScreen("choice");
  }

  function validatePassword() {
    if (password.length < 8) {
      return "use at least 8 characters so your space is easier to protect";
    }
    if (password !== confirmPassword) {
      return "those passwords do not match yet";
    }
    if (pin && !/^\d{4,6}$/.test(pin)) {
      return "your quick PIN needs 4 to 6 numbers";
    }
    return "";
  }

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const validation = validatePassword();
    if (!preferredName.trim()) {
      setMessage("add the name you would like Pace & Pulse to use");
      return;
    }
    if (!normaliseEmail(email)) {
      setMessage("add your email address first");
      return;
    }
    if (validation) {
      setMessage(validation);
      return;
    }

    setBusy(true);
    const cleanEmail = normaliseEmail(email);
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { preferred_name: preferredName.trim() },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    localStorage.setItem(LAST_EMAIL_KEY, cleanEmail);
    if (passwordHint.trim()) {
      localStorage.setItem(hintKey(cleanEmail), passwordHint.trim());
    }
    if (pin) {
      localStorage.setItem(pinKey(cleanEmail), await hashPin(pin));
    }

    setBusy(false);

    if (!data.session) {
      setMessage(
        "email confirmation is currently enabled for this project. turn off confirm email in supabase to create the workspace immediately, or connect a working smtp provider for confirmation emails."
      );
      setScreen("signup");
      return;
    }

    const firstWorkspaceSetup: OnboardingData = {
      ...initialOnboarding,
      preferredName: preferredName.trim(),
    };

    setOnboarding(firstWorkspaceSetup);
    setOnboardingStep(0);
    setProfileReady(true);
    setForcedOpen(true);
    setScreen("onboarding");
    setSession(data.session);
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!normaliseEmail(email) || !password) {
      setMessage("add your email and password first");
      return;
    }

    setBusy(true);
    const cleanEmail = normaliseEmail(email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      setMessage("that email and password combination did not work");
      setBusy(false);
      return;
    }

    if (rememberEmail) {
      localStorage.setItem(LAST_EMAIL_KEY, cleanEmail);
    } else {
      localStorage.removeItem(LAST_EMAIL_KEY);
    }

    setForcedOpen(false);
    setSession(data.session);
    setBusy(false);
  }

  async function sendReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!normaliseEmail(email)) {
      setMessage("add the email connected to your space");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      normaliseEmail(email),
      { redirectTo: window.location.origin }
    );
    setBusy(false);

    setMessage(
      error
        ? error.message
        : "a reset link is on its way — check your inbox and spam folder"
    );
  }

  function validateOnboardingStep() {
    if (onboardingStep === 0 && !onboarding.preferredName.trim()) {
      return "add the name you would like your workspace to use";
    }

    if (onboardingStep === 1) {
      const fields = [
        onboarding.annotationRate,
        onboarding.dailyGoal,
        onboarding.weeklyGoal,
        onboarding.monthlyGoal,
      ];
      if (fields.some((value) => Number(value) < 0 || value.trim() === "")) {
        return "check that your rate and goals contain valid numbers";
      }
    }

    return "";
  }

  function nextOnboardingStep() {
    const validation = validateOnboardingStep();
    if (validation) {
      setMessage(validation);
      return;
    }
    setMessage("");
    setOnboardingStep((current) => Math.min(2, current + 1));
  }

  async function saveOnboarding() {
    if (!session) return;

    const validation = validateOnboardingStep();
    if (validation) {
      setMessage(validation);
      return;
    }

    setBusy(true);
    setMessage("");

    let avatarUrl: string | null = null;

    if (avatarFile) {
      const extension = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const avatarPath = `${session.user.id}/profile.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(avatarPath, avatarFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        setBusy(false);
        setMessage(`your photo could not be uploaded: ${uploadError.message}`);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(avatarPath);

      avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
    }

    const savedPreferences: OnboardingData = {
      ...onboarding,
      preferredName:
        onboarding.preferredName.trim(),
    };

    const {
      data: updatedUserData,
      error: metadataError,
    } = await supabase.auth.updateUser({
      data: {
        preferred_name:
          savedPreferences.preferredName,
        pace_pulse_onboarding_complete: true,
        pace_pulse_preferences:
          savedPreferences,
        pace_pulse_avatar_url:
          avatarUrl,
      },
    });

    if (metadataError) {
      setBusy(false);
      setMessage(metadataError.message);
      return;
    }

    /*
      The profile table is an optional cloud mirror.
      The workspace no longer depends on it because
      some Supabase projects protect this table with
      row-level security.
    */
    await supabase
      .from("profiles")
      .upsert(
        {
          id: session.user.id,
          preferred_name:
            savedPreferences.preferredName,
          avatar_url: avatarUrl,
          onboarding_complete: true,
          platform:
            savedPreferences.platform,
          currency:
            savedPreferences.currency,
          annotation_rate: Number(
            savedPreferences.annotationRate
          ),
          daily_goal: Number(
            savedPreferences.dailyGoal
          ),
          weekly_goal: Number(
            savedPreferences.weeklyGoal
          ),
          monthly_goal: Number(
            savedPreferences.monthlyGoal
          ),
          theme: savedPreferences.theme,
          accent: savedPreferences.accent,
          font: savedPreferences.font,
          clock_format:
            savedPreferences.clockFormat,
          date_format:
            savedPreferences.dateFormat,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    if (updatedUserData.user) {
      setSession((current) =>
        current
          ? {
              ...current,
              user: updatedUserData.user,
            }
          : current
      );
    }

    applyWorkspacePreferences(
      savedPreferences
    );
    setBusy(false);
    setMessage("");
    setForcedOpen(false);
    setScreen("ready");
  }

  if (!sessionReady || (session && !profileReady)) {
    return (
      <div className="welcome-backdrop">
        <section className="welcome-card welcome-loading" aria-live="polite">
          <span className="welcome-pulse" />
          <p>opening your space</p>
        </section>
      </div>
    );
  }

  if (!supabaseConfigured) {
    return (
      <div className="welcome-backdrop">
        <section className="welcome-card">
          <img className="welcome-mark" src="/icons/pace-pulse-logo.png" alt="" />
          <p>one little setup step</p>
          <h2>connect Pace &amp; Pulse to Supabase</h2>
          <span>
            Add your Supabase URL and publishable key to the two Vite
            environment variables included in the setup guide.
          </span>
        </section>
      </div>
    );
  }

  if (session && screen === "ready") {
    return (
      <div className="welcome-backdrop">
        <section className="welcome-card welcome-ready">
          <img className="welcome-mark" src="/icons/pace-pulse-logo.png" alt="" />
          <p>everything is in place</p>
          <h2>your workspace is ready</h2>
          <span>
            Your preferences are saved to your account and this device is ready
            to open in your rhythm.
          </span>
          <button
            className="welcome-submit"
            type="button"
            onClick={() => setScreen("choice")}
          >
            enter pace &amp; pulse
          </button>
        </section>
      </div>
    );
  }

  if (
    session &&
    screen !== "onboarding" &&
    !forcedOpen
  ) {
    return null;
  }

  if (screen === "onboarding") {
    return (
      <div className="welcome-backdrop">
        <section className="welcome-card welcome-onboarding-card">
          <div className="onboarding-progress" aria-label="setup progress">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={index <= onboardingStep ? "active" : ""}
              />
            ))}
          </div>

          {onboardingStep === 0 && (
            <>
              <p>step 1 of 3 · about you</p>
              <h2>how should this space know you?</h2>
              <div className="welcome-form">
                <label>
                  <span>preferred name</span>
                  <input
                    autoFocus
                    value={onboarding.preferredName}
                    placeholder="the name that feels like you"
                    onChange={(event) =>
                      updateOnboarding("preferredName", event.target.value)
                    }
                  />
                </label>
                <div className="onboarding-avatar-upload">
                  <div className="onboarding-avatar-preview">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Profile preview" />
                    ) : (
                      <span aria-hidden="true">
                        {onboarding.preferredName.trim().charAt(0).toUpperCase() || "•"}
                      </span>
                    )}
                  </div>
                  <div className="onboarding-avatar-copy">
                    <span>profile picture <small>optional</small></span>
                    <label className="onboarding-upload-button">
                      choose a photo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          if (!file) return;

                          if (file.size > 5 * 1024 * 1024) {
                            setMessage("choose an image smaller than 5 MB");
                            event.target.value = "";
                            return;
                          }

                          setMessage("");
                          setAvatarFile(file);
                          setAvatarPreview(URL.createObjectURL(file));
                        }}
                      />
                    </label>
                    {avatarFile && (
                      <button
                        className="onboarding-remove-photo"
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview("");
                        }}
                      >
                        remove photo
                      </button>
                    )}
                    <small>PNG, JPG or WebP · up to 5 MB</small>
                  </div>
                </div>
              </div>
            </>
          )}

          {onboardingStep === 1 && (
            <>
              <p>step 2 of 3 · your work</p>
              <h2>shape the goals around your real work</h2>
              <div className="welcome-form onboarding-grid">
                <label className="onboarding-wide">
                  <span>annotation platform</span>
                  <input
                    value={onboarding.platform}
                    placeholder="for example: your annotation company or platform"
                    onChange={(event) =>
                      updateOnboarding("platform", event.target.value)
                    }
                  />
                </label>
                <fieldset className="onboarding-choice-group">
                  <legend>display currency</legend>
                  <div className="onboarding-choice-grid compact">
                    {[
                      ["ZAR", "zar"],
                      ["USD", "usd"],
                      ["EUR", "eur"],
                      ["GBP", "gbp"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        className={
                          onboarding.currency === value
                            ? "selected"
                            : ""
                        }
                        type="button"
                        onClick={() =>
                          updateOnboarding(
                            "currency",
                            value
                          )
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label>
                  <span>pay per annotation</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={onboarding.annotationRate}
                    onChange={(event) =>
                      updateOnboarding("annotationRate", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>daily goal</span>
                  <input
                    type="number"
                    min="0"
                    value={onboarding.dailyGoal}
                    onChange={(event) =>
                      updateOnboarding("dailyGoal", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>weekly goal</span>
                  <input
                    type="number"
                    min="0"
                    value={onboarding.weeklyGoal}
                    onChange={(event) =>
                      updateOnboarding("weeklyGoal", event.target.value)
                    }
                  />
                </label>
                <label className="onboarding-wide">
                  <span>monthly goal</span>
                  <input
                    type="number"
                    min="0"
                    value={onboarding.monthlyGoal}
                    onChange={(event) =>
                      updateOnboarding("monthlyGoal", event.target.value)
                    }
                  />
                </label>
              </div>
            </>
          )}

          {onboardingStep === 2 && (
            <>
              <p>step 3 of 3 · your space</p>
              <h2>choose what feels easiest to return to</h2>
              <div className="welcome-form">
                <fieldset className="onboarding-choice-group">
                  <legend>workspace theme</legend>
                  <div className="onboarding-choice-grid">
                    {themes.map(([value, label]) => (
                      <button
                        key={value}
                        className={
                          onboarding.theme === value ? "selected" : ""
                        }
                        type="button"
                        onClick={() => updateOnboarding("theme", value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="onboarding-choice-group">
                  <legend>accent</legend>
                  <div className="onboarding-choice-grid compact">
                    {accents.map(([value, label]) => (
                      <button
                        key={value}
                        className={
                          onboarding.accent === value ? "selected" : ""
                        }
                        type="button"
                        onClick={() => updateOnboarding("accent", value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="onboarding-choice-group">
                  <legend>handwriting font</legend>
                  <div className="onboarding-choice-grid font-choice-grid">
                    {fonts.map(([value, label]) => (
                      <button
                        key={value}
                        className={
                          onboarding.font === value
                            ? "selected"
                            : ""
                        }
                        type="button"
                        onClick={() =>
                          updateOnboarding(
                            "font",
                            value
                          )
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="onboarding-grid">
                  <fieldset className="onboarding-choice-group">
                    <legend>clock</legend>
                    <div className="onboarding-choice-grid">
                      {[
                        ["24", "24-hour"],
                        ["12", "12-hour"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          className={
                            onboarding.clockFormat === value
                              ? "selected"
                              : ""
                          }
                          type="button"
                          onClick={() =>
                            updateOnboarding(
                              "clockFormat",
                              value
                            )
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="onboarding-choice-group">
                    <legend>date format</legend>
                    <div className="onboarding-choice-grid date-choice-grid">
                      {[
                        ["DD/MM/YYYY", "dd/mm/yyyy"],
                        ["YYYY-MM-DD", "yyyy-mm-dd"],
                        ["MM/DD/YYYY", "mm/dd/yyyy"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          className={
                            onboarding.dateFormat === value
                              ? "selected"
                              : ""
                          }
                          type="button"
                          onClick={() =>
                            updateOnboarding(
                              "dateFormat",
                              value
                            )
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </div>
            </>
          )}

          {message && <p className="welcome-message">{message}</p>}

          <div className="welcome-actions onboarding-actions">
            {onboardingStep > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setOnboardingStep((current) => current - 1);
                }}
              >
                back
              </button>
            )}
            <button
              className="welcome-next"
              type="button"
              disabled={busy}
              onClick={
                onboardingStep === 2 ? saveOnboarding : nextOnboardingStep
              }
            >
              {busy
                ? "saving your space…"
                : onboardingStep === 2
                  ? "finish my workspace"
                  : "continue"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (screen === "welcome") {
    const current = welcomeSteps[step];
    return (
      <div className="welcome-backdrop">
        <section className="welcome-card">
          <button className="welcome-skip" type="button" onClick={finishWelcome}>
            skip intro
          </button>
          <img className="welcome-mark" src="/icons/pace-pulse-logo.png" alt="" />
          <p>{current.eyebrow}</p>
          <h2>{current.title}</h2>
          <span>{current.copy}</span>
          <div className="welcome-dots">
            {welcomeSteps.map((item, index) => (
              <button
                key={item.title}
                className={index === step ? "welcome-dot-active" : ""}
                type="button"
                onClick={() => setStep(index)}
              />
            ))}
          </div>
          <div className="welcome-actions">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)}>
                back
              </button>
            )}
            <button
              className="welcome-next"
              type="button"
              onClick={() => {
                if (
                  step !==
                  welcomeSteps.length - 1
                ) {
                  setStep(step + 1);
                  return;
                }

                if (
                  forcedOpen &&
                  session
                ) {
                  localStorage.setItem(
                    WELCOME_KEY,
                    "yes"
                  );
                  setForcedOpen(false);
                  setScreen("choice");
                  return;
                }

                finishWelcome();
              }}
            >
              {step === welcomeSteps.length - 1
                ? "set up or tune in"
                : "next"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (screen === "choice") {
    return (
      <div className="welcome-backdrop">
        <section className="welcome-card welcome-choice">
          <img className="welcome-mark" src="/icons/pace-pulse-logo.png" alt="" />
          <p>welcome to pace &amp; pulse</p>
          <h2>work in your own rhythm</h2>
          <span>
            Create your own gentle workspace, or tune back into the one that already knows you.
          </span>
          <div className="welcome-choice-actions">
            <button
              className="welcome-next"
              type="button"
              onClick={() => resetForm("signup")}
            >
              create my space
            </button>
            <button type="button" onClick={() => resetForm("signin")}>
              tune in
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (screen === "check-email") {
    return (
      <div className="welcome-backdrop">
        <section className="welcome-card">
          <img className="welcome-mark" src="/icons/pace-pulse-logo.png" alt="" />
          <p>confirmation is switched on</p>
          <h2>email confirmation is required</h2>
          <span>
            This project is currently configured to require an email
            confirmation before the workspace can open. For the immediate
            pace & pulse setup flow, turn off confirm email in Supabase.
          </span>
          <div className="welcome-actions">
            <button
              className="welcome-next"
              type="button"
              onClick={() => resetForm("signin")}
            >
              back to tune in
            </button>
          </div>
        </section>
      </div>
    );
  }

  const isSignup = screen === "signup";
  const isForgot = screen === "forgot";

  return (
    <div className="welcome-backdrop">
      <section className="welcome-card welcome-auth-card">
        <button
          className="welcome-back"
          type="button"
          onClick={() => resetForm(isForgot ? "signin" : "choice")}
        >
          ← back
        </button>
        <img
          className="welcome-mark welcome-auth-mark"
          src="/icons/pace-pulse-logo.png"
          alt=""
        />
        <p>
          {isSignup
            ? "make this space yours"
            : isForgot
              ? "a gentle way back in"
              : "welcome back"}
        </p>
        <h2>
          {isSignup
            ? "create your pace & pulse space"
            : isForgot
              ? "reset your password"
              : "tune into your workspace"}
        </h2>

        <form
          className="welcome-form"
          onSubmit={
            isSignup ? createAccount : isForgot ? sendReset : signIn
          }
        >
          {isSignup && (
            <label>
              <span>preferred name</span>
              <input
                autoFocus
                value={preferredName}
                placeholder="the name that feels like you"
                onChange={(event) => setPreferredName(event.target.value)}
              />
            </label>
          )}

          <label>
            <span>email</span>
            <input
              autoFocus={!isSignup}
              type="email"
              value={email}
              autoComplete="email"
              placeholder="you@example.com"
              onChange={(event) => {
                setEmail(event.target.value);
                setShowHint(false);
              }}
            />
          </label>

          {!isForgot && (
            <label>
              <span>password</span>
              <div className="welcome-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder={isSignup ? "at least 8 characters" : "your password"}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "hide" : "show"}
                </button>
              </div>
            </label>
          )}

          {isSignup && (
            <>
              <div className="welcome-password-note">
                <strong>your private key to this space</strong>
                <span>
                  tuning out locks the workspace. your password is required
                  to tune back in on a signed-out device.
                </span>
              </div>

              <label>
                <span>confirm password</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  autoComplete="new-password"
                  placeholder="type it once more"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
              <label>
                <span>
                  password hint <small>optional · saved on this device</small>
                </span>
                <input
                  value={passwordHint}
                  placeholder="a clue only you will understand"
                  onChange={(event) => setPasswordHint(event.target.value)}
                />
              </label>
              <label>
                <span>
                  quick PIN <small>optional · 4 to 6 numbers</small>
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  maxLength={6}
                  placeholder="••••"
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, ""))
                  }
                />
              </label>
            </>
          )}

          {!isSignup && !isForgot && (
            <>
              <label className="welcome-remember">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(event) => setRememberEmail(event.target.checked)}
                />
                <span>remember my email on this device</span>
              </label>
              <div className="welcome-help-row">
                <button
                  type="button"
                  onClick={() => setShowHint((current) => !current)}
                >
                  need a little clue? 🌿
                </button>
                <button type="button" onClick={() => resetForm("forgot")}>
                  forgot password?
                </button>
              </div>
              {showHint && (
                <div className="welcome-hint">
                  <strong>a gentle nudge</strong>
                  <span>
                    {savedHint ||
                      "There is no hint saved for this email on this device yet."}
                  </span>
                </div>
              )}
            </>
          )}

          {message && <p className="welcome-message">{message}</p>}

          <button className="welcome-submit" type="submit" disabled={busy}>
            {busy
              ? "just a moment…"
              : isSignup
                ? "create my space"
                : isForgot
                  ? "send reset link"
                  : "tune in"}
          </button>
        </form>

        {!isForgot && (
          <button
            className="welcome-switch"
            type="button"
            onClick={() => resetForm(isSignup ? "signin" : "signup")}
          >
            {isSignup
              ? "already have a space? tune in"
              : "new here? create your space"}
          </button>
        )}
      </section>
    </div>
  );
}
