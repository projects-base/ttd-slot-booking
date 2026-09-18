#!/usr/bin/env bash
#
# Bundles the extension into dist/ttd-seva-bot-<version>.zip
#
# Files are listed explicitly rather than zipping the working tree, so local
# scratch files (create_users.html, notes, .git, …) can never leak into a
# store upload.
#
# Usage:  ./scripts/bundle.sh
# CI use: sets `version` and `zip` as GitHub Actions step outputs.

set -euo pipefail

cd "$(dirname "$0")/.."

# Every file the packed extension needs at runtime.
FILES=(
  manifest.json
  background.js
  content.js
  data.js
  sidepanel.html
  sidepanel.js
  firebase-config.js
  firebase/firebase-app-compat.js
  firebase/firebase-auth-compat.js
  firebase/firebase-firestore-compat.js
  icon16.png
  icon32.png
  icon48.png
  icon128.png
  namam.png
)

missing=()
for f in "${FILES[@]}"; do
  [ -f "$f" ] || missing+=("$f")
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "Missing required file(s):" >&2
  printf '  %s\n' "${missing[@]}" >&2
  # firebase-config.js is gitignored, so this is the expected failure on a
  # fresh checkout. Call it out specifically — a bundle without it installs
  # fine but dies at "Firebase SDK or Config not loaded" behind the login overlay.
  for f in "${missing[@]}"; do
    if [ "$f" = "firebase-config.js" ]; then
      echo >&2
      echo "firebase-config.js is gitignored and must be supplied at build time." >&2
      echo "In CI it is written from the FIREBASE_CONFIG_JS secret." >&2
    fi
  done
  exit 1
fi

VERSION=$(node -p "require('./manifest.json').version")
OUT="dist/ttd-seva-bot-${VERSION}.zip"

rm -rf dist
mkdir -p dist

# `zip` on CI and Unix; fall back to Python's zipfile so the script also runs
# in Git Bash on Windows, where `zip` is not installed.
if command -v zip >/dev/null 2>&1; then
  zip -q -X "$OUT" "${FILES[@]}"
elif PY=$(command -v python3 || command -v python); then
  "$PY" -c '
import sys, zipfile
out, files = sys.argv[1], sys.argv[2:]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in files:
        z.write(f, f)
' "$OUT" "${FILES[@]}"
else
  echo "Need either 'zip' or Python on PATH to build the bundle." >&2
  exit 1
fi

echo "Built $OUT ($(du -h "$OUT" | cut -f1), ${#FILES[@]} files)"

# Expose results to a GitHub Actions workflow when running in one.
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "version=$VERSION"
    echo "zip=$OUT"
  } >> "$GITHUB_OUTPUT"
fi
