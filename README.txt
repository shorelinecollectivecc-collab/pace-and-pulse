full v1.1.0 version replacements

replace:
package.json
src-tauri/tauri.conf.json
src-tauri/Cargo.toml

then run:
npm install
npm run build
npx tauri build

this keeps the npm package version, tauri bundle version and rust app version aligned at 1.1.0.
