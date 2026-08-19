pace & pulse · v1.1 polish pass

replace these full files:

src/App.tsx
src/App.css
src/SettingsPanel.tsx
src/SettingsPanel.css

included:
- calm startup splash using the existing pace & pulse icon
- tune-out confirmation instead of immediate sign-out
- subtle sidebar, workspace and dialog motion
- respects reduced-motion accessibility settings
- about panel updated to v1.1.0
- new release-notes section inside about the app

after replacing:
npm run build

when that succeeds:
npx tauri dev

test the splash, tune-out confirmation and about panel before making a new installer.

after the polish is approved, also change package.json and src-tauri/tauri.conf.json version to 1.1.0 before the release build.
