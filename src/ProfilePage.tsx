import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import "./ProfilePage.css";

const PROFILE_STORAGE_KEY = "pace-pulse-profile";

const hobbyIdeas = [
  "reading",
  "gaming",
  "drawing",
  "photography",
  "gardening",
  "cooking",
  "baking",
  "walking",
  "swimming",
  "crafts",
  "puzzles",
  "journaling",
  "films",
  "dancing",
  "learning",
  "collecting",
];

const supportIdeas = [
  "gentle reminders",
  "written steps",
  "quiet space",
  "headphones",
  "movement breaks",
  "body doubling",
  "extra processing time",
  "flexible plans",
];

export type ProfileData = {
  name: string;
  email: string;
  cellNumber: string;
  position: string;
  company: string;
  profilePhoto: string;
  favouriteGenres: string;
  favouriteArtists: string;
  comfortAlbum: string;
  focusMusic: string;
  songOnRepeat: string;
  favouriteMovies: string;
  favouriteSeries: string;
  favouriteDocumentaries: string;
  comfortWatch: string;
  favouriteVideoStyles: string;
  watchingMood: string;
  screenBoundaries: string;
  hobbies: string[];
  customHobby: string;
  supportPreferences: string[];
  bestWorkTime: string;
  communicationStyle: string;
  focusHelps: string;
  overwhelmedSigns: string;
  resetHelps: string;
  favouriteReward: string;
  aboutMe: string;
};

export type ProfileSummary = {
  name: string;
  position: string;
  profilePhoto: string;
};

type ProfilePageProps = {
  formattedDate: string;
  themeName: string;
  themeDescription: string;
  themeBanner: string;
  onProfileChange?: (summary: ProfileSummary) => void;
};

const emptyProfile: ProfileData = {
  name: "",
  email: "",
  cellNumber: "",
  position: "",
  company: "",
  profilePhoto: "",
  favouriteGenres: "",
  favouriteArtists: "",
  comfortAlbum: "",
  focusMusic: "",
  songOnRepeat: "",
  favouriteMovies: "",
  favouriteSeries: "",
  favouriteDocumentaries: "",
  comfortWatch: "",
  favouriteVideoStyles: "",
  watchingMood: "",
  screenBoundaries: "",
  hobbies: [],
  customHobby: "",
  supportPreferences: [],
  bestWorkTime: "",
  communicationStyle: "",
  focusHelps: "",
  overwhelmedSigns: "",
  resetHelps: "",
  favouriteReward: "",
  aboutMe: "",
};

function loadProfile(): ProfileData {
  try {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);

    if (!saved) {
      return emptyProfile;
    }

    const parsed = JSON.parse(saved) as Partial<ProfileData>;

    return {
      ...emptyProfile,
      ...parsed,
      name: parsed.name === "maela" ? "" : parsed.name ?? "",
      position:
        parsed.position === "music annotator"
          ? ""
          : parsed.position ?? "",
      hobbies: Array.isArray(parsed.hobbies)
        ? parsed.hobbies.filter(
            (hobby): hobby is string => typeof hobby === "string"
          )
        : [],
      supportPreferences: Array.isArray(
        parsed.supportPreferences
      )
        ? parsed.supportPreferences.filter(
            (preference): preference is string =>
              typeof preference === "string"
          )
        : [],
    };
  } catch {
    return emptyProfile;
  }
}

export function getSavedProfileSummary(): ProfileSummary {
  const profile = loadProfile();

  return {
    name: profile.name.trim() || "your name",
    position: profile.position.trim() || "your role",
    profilePhoto: profile.profilePhoto,
  };
}

function makeSummary(profile: ProfileData): ProfileSummary {
  return {
    name: profile.name.trim() || "your name",
    position: profile.position.trim() || "your role",
    profilePhoto: profile.profilePhoto,
  };
}

function resizeProfilePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () =>
      reject(new Error("the picture could not be read"));

    reader.onload = () => {
      const image = new Image();

      image.onerror = () =>
        reject(new Error("the picture could not be opened"));

      image.onload = () => {
        const size = 420;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("the picture could not be prepared"));
          return;
        }

        canvas.width = size;
        canvas.height = size;

        const sourceSize = Math.min(
          image.naturalWidth,
          image.naturalHeight
        );
        const sourceX =
          (image.naturalWidth - sourceSize) / 2;
        const sourceY =
          (image.naturalHeight - sourceSize) / 2;

        context.drawImage(
          image,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          size,
          size
        );

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

export default function ProfilePage({
  formattedDate,
  themeName,
  themeDescription,
  themeBanner,
  onProfileChange,
}: ProfilePageProps) {
  const [profile, setProfile] =
    useState<ProfileData>(loadProfile);
  const [saved, setSaved] = useState(true);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(() => {
    const parts = profile.name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return "y";
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toLowerCase();
  }, [profile.name]);

  useEffect(() => {
    setSaved(false);

    const saveTimer = window.setTimeout(() => {
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify(profile)
      );
      onProfileChange?.(makeSummary(profile));
      setSaved(true);
    }, 350);

    return () => window.clearTimeout(saveTimer);
  }, [onProfileChange, profile]);

  function updateField<Key extends keyof ProfileData>(
    field: Key,
    value: ProfileData[Key]
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleListItem(
    field: "hobbies" | "supportPreferences",
    item: string
  ) {
    setProfile((current) => {
      const currentItems = current[field];
      const nextItems = currentItems.includes(item)
        ? currentItems.filter((value) => value !== item)
        : [...currentItems, item];

      return {
        ...current,
        [field]: nextItems,
      };
    });
  }

  function addCustomHobby() {
    const hobby = profile.customHobby.trim().toLowerCase();

    if (!hobby) {
      return;
    }

    setProfile((current) => ({
      ...current,
      hobbies: current.hobbies.includes(hobby)
        ? current.hobbies
        : [...current.hobbies, hobby],
      customHobby: "",
    }));
  }

  async function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhotoError("please choose an image file");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setPhotoError("please choose an image smaller than 8 mb");
      return;
    }

    try {
      setPhotoError("");
      const resizedPhoto = await resizeProfilePhoto(file);
      updateField("profilePhoto", resizedPhoto);
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : "the picture could not be saved"
      );
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="profile-page">
      <header className="profile-page-header">
        <div>
          <p>about me</p>
          <h2>my corner of pace &amp; pulse</h2>
        </div>

        <div className="profile-save-state">
          <span className={saved ? "saved-dot" : ""} />
          {saved ? "saved gently" : "saving"}
        </div>

        <time>{formattedDate}</time>
      </header>

      <section
        className="profile-theme-banner"
        style={{ backgroundImage: `url(${themeBanner})` }}
      >
        <div>
          <p>{themeName}</p>
          <span>{themeDescription}</span>
        </div>
      </section>

      <div className="profile-layout">
        <section className="profile-card profile-identity-card">
          <div className="profile-section-heading">
            <div>
              <p>the basics</p>
              <h3>the person behind the work</h3>
            </div>
          </div>

          <div className="profile-identity-content">
            <div className="profile-photo-area">
              <button
                className="profile-photo-button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                {profile.profilePhoto ? (
                  <img
                    src={profile.profilePhoto}
                    alt={`${profile.name || "my"} profile`}
                  />
                ) : (
                  <span>{initials}</span>
                )}

                <small>change picture</small>
              </button>

              <input
                ref={fileInputRef}
                className="profile-file-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />

              {profile.profilePhoto && (
                <button
                  className="profile-photo-remove"
                  type="button"
                  onClick={() => updateField("profilePhoto", "")}
                >
                  remove picture
                </button>
              )}

              {photoError && (
                <p className="profile-photo-error">
                  {photoError}
                </p>
              )}
            </div>

            <div className="profile-field-grid">
              <label>
                <span>name</span>
                <input
                  type="text"
                  value={profile.name}
                  placeholder="what should we call you?"
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                />
              </label>

              <label>
                <span>email</span>
                <input
                  type="email"
                  value={profile.email}
                  placeholder="your email address"
                  onChange={(event) =>
                    updateField("email", event.target.value)
                  }
                />
              </label>

              <label>
                <span>cell number</span>
                <input
                  type="tel"
                  value={profile.cellNumber}
                  placeholder="your contact number"
                  onChange={(event) =>
                    updateField(
                      "cellNumber",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                <span>position</span>
                <input
                  type="text"
                  value={profile.position}
                  placeholder="what do you do?"
                  onChange={(event) =>
                    updateField("position", event.target.value)
                  }
                />
              </label>

              <label className="profile-field-wide">
                <span>company</span>
                <input
                  type="text"
                  value={profile.company}
                  placeholder="where do you work?"
                  onChange={(event) =>
                    updateField("company", event.target.value)
                  }
                />
              </label>
            </div>
          </div>
        </section>

        <section className="profile-card profile-music-card">
          <div className="profile-section-heading">
            <div>
              <p>my favourites</p>
              <h3>the music that feels like me</h3>
            </div>
            <span>music corner</span>
          </div>

          <div className="profile-field-grid">
            <label>
              <span>favourite genres</span>
              <input
                type="text"
                value={profile.favouriteGenres}
                placeholder="for example indie, r&b, jazz"
                onChange={(event) =>
                  updateField(
                    "favouriteGenres",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>favourite artists</span>
              <input
                type="text"
                value={profile.favouriteArtists}
                placeholder="the artists you always return to"
                onChange={(event) =>
                  updateField(
                    "favouriteArtists",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>comfort album</span>
              <input
                type="text"
                value={profile.comfortAlbum}
                placeholder="the album that settles your brain"
                onChange={(event) =>
                  updateField(
                    "comfortAlbum",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>focus music</span>
              <input
                type="text"
                value={profile.focusMusic}
                placeholder="what helps you get into flow?"
                onChange={(event) =>
                  updateField(
                    "focusMusic",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="profile-field-wide">
              <span>song on repeat</span>
              <input
                type="text"
                value={profile.songOnRepeat}
                placeholder="today's current repeat track"
                onChange={(event) =>
                  updateField(
                    "songOnRepeat",
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        </section>

        <section className="profile-card profile-screen-card">
          <div className="profile-section-heading">
            <div>
              <p>my screen favourites</p>
              <h3>the stories i return to</h3>
            </div>
            <span>film &amp; series corner</span>
          </div>

          <div className="profile-field-grid">
            <label>
              <span>favourite movies</span>
              <input
                type="text"
                value={profile.favouriteMovies}
                placeholder="films you never mind watching again"
                onChange={(event) =>
                  updateField(
                    "favouriteMovies",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>favourite series</span>
              <input
                type="text"
                value={profile.favouriteSeries}
                placeholder="series that keep your attention"
                onChange={(event) =>
                  updateField(
                    "favouriteSeries",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>favourite documentaries</span>
              <input
                type="text"
                value={profile.favouriteDocumentaries}
                placeholder="subjects or documentaries you enjoy"
                onChange={(event) =>
                  updateField(
                    "favouriteDocumentaries",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>comfort watch</span>
              <input
                type="text"
                value={profile.comfortWatch}
                placeholder="what feels familiar and safe?"
                onChange={(event) =>
                  updateField(
                    "comfortWatch",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="profile-field-wide">
              <span>video styles i enjoy</span>
              <input
                type="text"
                value={profile.favouriteVideoStyles}
                placeholder="animation, live performances, adverts, slow cinema..."
                onChange={(event) =>
                  updateField(
                    "favouriteVideoStyles",
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        </section>

        <section className="profile-card profile-watch-card">
          <div className="profile-section-heading">
            <div>
              <p>how i like to watch</p>
              <h3>make screen time feel better</h3>
            </div>
            <span>optional</span>
          </div>

          <div className="profile-textarea-grid profile-watch-grid">
            <label>
              <span>what i want from a watch</span>
              <textarea
                rows={4}
                value={profile.watchingMood}
                placeholder="something funny, familiar, absorbing, gentle..."
                onChange={(event) =>
                  updateField(
                    "watchingMood",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>things i prefer to avoid</span>
              <textarea
                rows={4}
                value={profile.screenBoundaries}
                placeholder="themes, sounds or visuals that feel too much"
                onChange={(event) =>
                  updateField(
                    "screenBoundaries",
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        </section>

        <section className="profile-card profile-hobbies-card">
          <div className="profile-section-heading">
            <div>
              <p>things i enjoy</p>
              <h3>fuel for my brain teasers</h3>
            </div>
            <span>{profile.hobbies.length} chosen</span>
          </div>

          <p className="profile-help-copy">
            choose anything you enjoy. this helps brain teasers
            suggest side quests that actually suit you.
          </p>

          <div className="profile-chip-grid">
            {hobbyIdeas.map((hobby) => {
              const selected = profile.hobbies.includes(hobby);

              return (
                <button
                  key={hobby}
                  className={
                    selected
                      ? "profile-chip profile-chip-selected"
                      : "profile-chip"
                  }
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    toggleListItem("hobbies", hobby)
                  }
                >
                  {selected && <span>✓</span>}
                  {hobby}
                </button>
              );
            })}
          </div>

          <div className="profile-custom-hobby">
            <input
              type="text"
              value={profile.customHobby}
              placeholder="add another hobby"
              onChange={(event) =>
                updateField("customHobby", event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomHobby();
                }
              }}
            />
            <button type="button" onClick={addCustomHobby}>
              add it
            </button>
          </div>

          {profile.hobbies.some(
            (hobby) => !hobbyIdeas.includes(hobby)
          ) && (
            <div className="profile-added-hobbies">
              {profile.hobbies
                .filter((hobby) => !hobbyIdeas.includes(hobby))
                .map((hobby) => (
                  <button
                    key={hobby}
                    type="button"
                    onClick={() =>
                      toggleListItem("hobbies", hobby)
                    }
                  >
                    {hobby} ×
                  </button>
                ))}
            </div>
          )}
        </section>

        <section className="profile-card profile-support-card">
          <div className="profile-section-heading">
            <div>
              <p>what helps me</p>
              <h3>make the workspace kinder</h3>
            </div>
          </div>

          <div className="profile-chip-grid profile-support-grid">
            {supportIdeas.map((preference) => {
              const selected =
                profile.supportPreferences.includes(preference);

              return (
                <button
                  key={preference}
                  className={
                    selected
                      ? "profile-chip profile-chip-selected"
                      : "profile-chip"
                  }
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    toggleListItem(
                      "supportPreferences",
                      preference
                    )
                  }
                >
                  {selected && <span>✓</span>}
                  {preference}
                </button>
              );
            })}
          </div>

          <div className="profile-field-grid profile-select-grid">
            <label>
              <span>my best work time</span>
              <select
                value={profile.bestWorkTime}
                onChange={(event) =>
                  updateField(
                    "bestWorkTime",
                    event.target.value
                  )
                }
              >
                <option value="">choose if useful</option>
                <option value="early morning">early morning</option>
                <option value="late morning">late morning</option>
                <option value="afternoon">afternoon</option>
                <option value="evening">evening</option>
                <option value="late night">late night</option>
                <option value="it changes">it changes</option>
              </select>
            </label>

            <label>
              <span>communication feels easiest as</span>
              <select
                value={profile.communicationStyle}
                onChange={(event) =>
                  updateField(
                    "communicationStyle",
                    event.target.value
                  )
                }
              >
                <option value="">choose if useful</option>
                <option value="short written notes">
                  short written notes
                </option>
                <option value="clear step-by-step instructions">
                  clear step-by-step instructions
                </option>
                <option value="voice or video conversation">
                  voice or video conversation
                </option>
                <option value="visual examples">
                  visual examples
                </option>
                <option value="a mix depending on the day">
                  a mix depending on the day
                </option>
              </select>
            </label>
          </div>
        </section>

        <section className="profile-card profile-manual-card">
          <div className="profile-section-heading">
            <div>
              <p>my tiny user manual</p>
              <h3>helpful things to remember</h3>
            </div>
          </div>

          <div className="profile-textarea-grid">
            <label>
              <span>things that help me focus</span>
              <textarea
                rows={3}
                value={profile.focusHelps}
                placeholder="music, a timer, one clear task, a snack..."
                onChange={(event) =>
                  updateField("focusHelps", event.target.value)
                }
              />
            </label>

            <label>
              <span>signs i may be overwhelmed</span>
              <textarea
                rows={3}
                value={profile.overwhelmedSigns}
                placeholder="what might you notice before burnout?"
                onChange={(event) =>
                  updateField(
                    "overwhelmedSigns",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>what helps me reset</span>
              <textarea
                rows={3}
                value={profile.resetHelps}
                placeholder="quiet, movement, water, no questions..."
                onChange={(event) =>
                  updateField("resetHelps", event.target.value)
                }
              />
            </label>

            <label>
              <span>a reward that motivates me</span>
              <textarea
                rows={3}
                value={profile.favouriteReward}
                placeholder="a favourite song, tea, a game, outside time..."
                onChange={(event) =>
                  updateField(
                    "favouriteReward",
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        </section>

        <section className="profile-card profile-about-card">
          <div className="profile-section-heading">
            <div>
              <p>anything else</p>
              <h3>a note about me</h3>
            </div>
            <span>optional</span>
          </div>

          <textarea
            rows={5}
            value={profile.aboutMe}
            placeholder="anything you want this space to remember about you"
            onChange={(event) =>
              updateField("aboutMe", event.target.value)
            }
          />

          <p className="profile-private-note">
            this stays in this browser with the rest of your
            pace &amp; pulse information.
          </p>
        </section>
      </div>
    </div>
  );
}
