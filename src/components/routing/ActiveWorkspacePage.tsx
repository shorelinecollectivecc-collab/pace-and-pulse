import type { Dispatch, SetStateAction } from "react";
import BrainTeasersPage from "../../BrainTeasersPage";
import LittleJournalPage from "../../LittleJournalPage";
import LittleNudgesPage from "../../LittleNudgesPage";
import LittleWinsPage from "../../LittleWinsPage";
import NextStepsPage from "../../NextStepsPage";
import ProfilePage, {
  type ProfileSummary,
} from "../../ProfilePage";
import VideoRhythmPage, {
  type VideoAnnotationRecord,
} from "../../VideoRhythmPage";
import WorkMapPage from "../../WorkMapPage";
import WorkTrailPage from "../../WorkTrailPage";
import type {
  ActivePage,
  AnnotationRecord,
  FontId,
  ThemeId,
} from "../../types/app";
import DailyDashboard from "../pages/DailyDashboard";
import PersonalisationPage from "../pages/PersonalisationPage";

type ThemeDetails = {
  name: string;
  description: string;
  banner: string;
};

type ActiveWorkspacePageProps = {
  activePage: ActivePage;
  formattedDate: string;
  theme: ThemeDetails;
  activeTheme: ThemeId;
  activeFont: FontId;
  annotations: AnnotationRecord[];
  videoAnnotations: VideoAnnotationRecord[];
  annotationCount: number;
  dailyGoal: number;
  progress: number;
  formattedEarnings: string;
  formattedUsd: string;
  showConvertedUsd: boolean;
  autoSaveEnabled: boolean;
  showUndo: boolean;
  progressMessage: string;
  onThemeChange: (theme: ThemeId) => void;
  onFontChange: (font: FontId) => void;
  onProfileChange: (profile: ProfileSummary) => void;
  onVideoAnnotationsChange: Dispatch<
    SetStateAction<VideoAnnotationRecord[]>
  >;
  onAddAnnotation: () => void;
  onUndoLast: () => void;
};

export default function ActiveWorkspacePage({
  activePage,
  formattedDate,
  theme,
  activeTheme,
  activeFont,
  annotations,
  videoAnnotations,
  annotationCount,
  dailyGoal,
  progress,
  formattedEarnings,
  formattedUsd,
  showConvertedUsd,
  autoSaveEnabled,
  showUndo,
  progressMessage,
  onThemeChange,
  onFontChange,
  onProfileChange,
  onVideoAnnotationsChange,
  onAddAnnotation,
  onUndoLast,
}: ActiveWorkspacePageProps) {
  switch (activePage) {
    case "about":
      return (
        <ProfilePage
          formattedDate={formattedDate}
          themeName={theme.name}
          themeDescription={theme.description}
          themeBanner={theme.banner}
          onProfileChange={onProfileChange}
        />
      );
    case "themes":
      return (
        <PersonalisationPage
          formattedDate={formattedDate}
          activeTheme={activeTheme}
          activeFont={activeFont}
          annotations={annotations}
          videoAnnotations={videoAnnotations}
          onThemeChange={onThemeChange}
          onFontChange={onFontChange}
        />
      );
    case "history":
      return (
        <WorkTrailPage
          annotations={annotations}
          videoAnnotations={videoAnnotations}
        />
      );
    case "goals":
      return (
        <NextStepsPage
          annotations={annotations}
          videoAnnotations={videoAnnotations}
        />
      );
    case "planner":
      return <WorkMapPage />;
    case "progress":
      return (
        <LittleWinsPage
          annotations={annotations}
          videoAnnotations={videoAnnotations}
        />
      );
    case "journal":
      return (
        <LittleJournalPage
          formattedDate={formattedDate}
          themeName={theme.name}
          themeDescription={theme.description}
          themeBanner={theme.banner}
        />
      );
    case "brain":
      return (
        <BrainTeasersPage
          formattedDate={formattedDate}
          themeName={theme.name}
          themeDescription={theme.description}
          themeBanner={theme.banner}
        />
      );
    case "nudges":
      return (
        <LittleNudgesPage
          formattedDate={formattedDate}
          themeName={theme.name}
          themeDescription={theme.description}
          themeBanner={theme.banner}
        />
      );
    case "video":
      return (
        <VideoRhythmPage
          formattedDate={formattedDate}
          themeName={theme.name}
          themeDescription={theme.description}
          themeBanner={theme.banner}
          annotations={videoAnnotations}
          onAnnotationsChange={onVideoAnnotationsChange}
        />
      );
    default:
      return (
        <DailyDashboard
          formattedDate={formattedDate}
          themeBanner={theme.banner}
          themeName={theme.name}
          themeDescription={theme.description}
          annotationCount={annotationCount}
          dailyGoal={dailyGoal}
          progress={progress}
          formattedEarnings={formattedEarnings}
          formattedUsd={formattedUsd}
          showConvertedUsd={showConvertedUsd}
          autoSaveEnabled={autoSaveEnabled}
          showUndo={showUndo}
          progressMessage={progressMessage}
          onAddAnnotation={onAddAnnotation}
          onUndoLast={onUndoLast}
        />
      );
  }
}
