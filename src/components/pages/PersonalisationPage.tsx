import SettingsPanel from "../../SettingsPanel";
import type { VideoAnnotationRecord } from "../../VideoRhythmPage";
import { fontOptions, themeOptions } from "../../constants/app";
import type {
  AnnotationRecord,
  FontId,
  ThemeId,
} from "../../types/app";

type PersonalisationPageProps = {
  formattedDate: string;
  activeTheme: ThemeId;
  activeFont: FontId;
  annotations: AnnotationRecord[];
  videoAnnotations: VideoAnnotationRecord[];
  onThemeChange: (theme: ThemeId) => void;
  onFontChange: (font: FontId) => void;
};

export default function PersonalisationPage({
  formattedDate,
  activeTheme,
  activeFont,
  annotations,
  videoAnnotations,
  onThemeChange,
  onFontChange,
}: PersonalisationPageProps) {
  const currentTheme =
    themeOptions.find((theme) => theme.id === activeTheme) ??
    themeOptions[0];
  const currentFont =
    fontOptions.find((font) => font.id === activeFont) ??
    fontOptions[0];

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
            <span>current · {currentTheme.name}</span>
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
                  onClick={() => onThemeChange(theme.id)}
                >
                  <img src={theme.banner} alt="" />
                  <span className="theme-option-shade" />
                  <span className="theme-option-copy">
                    <strong>{theme.name}</strong>
                    <small>{theme.description}</small>
                  </span>
                  {isSelected && (
                    <span className="chosen-label">chosen</span>
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
                  onClick={() => onFontChange(font.id)}
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
