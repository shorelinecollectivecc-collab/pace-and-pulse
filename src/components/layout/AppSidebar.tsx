import type { ProfileSummary } from "../../ProfilePage";
import { navigation } from "../../constants/app";
import type { ActivePage } from "../../types/app";

type AppSidebarProps = {
  sidebarOpen: boolean;
  profileMenuOpen: boolean;
  activePage: ActivePage;
  profileSummary: ProfileSummary;
  onToggleSidebar: () => void;
  onToggleProfileMenu: () => void;
  onCloseProfileMenu: () => void;
  onOpenPage: (page: ActivePage) => void;
  onSignOut: () => void;
};

const availablePages = new Set<ActivePage>([
  "daily",
  "video",
  "goals",
  "planner",
  "progress",
  "history",
  "journal",
  "brain",
]);

export default function AppSidebar({
  sidebarOpen,
  profileMenuOpen,
  activePage,
  profileSummary,
  onToggleSidebar,
  onToggleProfileMenu,
  onCloseProfileMenu,
  onOpenPage,
  onSignOut,
}: AppSidebarProps) {
  return (
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
          onClick={onToggleSidebar}
        >
          {sidebarOpen ? "‹" : "›"}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const isAvailable = availablePages.has(item.id);
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
                  ? () => onOpenPage(item.id)
                  : undefined
              }
            >
              <span className="nav-mark" />
              {sidebarOpen ? (
                <span>{item.name}</span>
              ) : (
                <span className="nav-short">{item.short}</span>
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
                onClick={onCloseProfileMenu}
              >
                ×
              </button>
            </div>

            <button
              className="profile-menu-item"
              type="button"
              onClick={() => onOpenPage("about")}
            >
              <span />
              about me
            </button>

            <button
              className="profile-menu-item"
              type="button"
              onClick={() => onOpenPage("themes")}
            >
              <span />
              make it mine
            </button>

            <button
              className="profile-menu-item"
              type="button"
              onClick={() => onOpenPage("nudges")}
            >
              <span />
              little nudges
            </button>

            <button
              className="profile-menu-item"
              type="button"
              onClick={onSignOut}
            >
              <span />
              sign out
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
          onClick={onToggleProfileMenu}
        >
          <span className="profile-circle">
            {profileSummary.profilePhoto ? (
              <img src={profileSummary.profilePhoto} alt="" />
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
              <strong>{profileSummary.name || "your name"}</strong>
              <small>{profileSummary.position || "your role"}</small>
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
  );
}
