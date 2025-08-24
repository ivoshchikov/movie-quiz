#!/usr/bin/env bash
set -euo pipefail

TS=$(date +%F-%H%M%S)
OUTROOT="${PWD}/exports"
OUTDIR="${OUTROOT}/project-${TS}"
ARCHIVE="${OUTROOT}/hard-quiz-frontend-${TS}.zip"

mkdir -p "${OUTDIR}"

# 1) определить корень проекта
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  ROOT=$(git rev-parse --show-toplevel)
else
  ROOT="${PWD}"
fi

echo "Project root: ${ROOT}"

# 2) список файлов (если git — берём трекаемые)
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "${ROOT}" ls-files > "${OUTDIR}/filelist.txt"
else
  # запасной вариант без git
  find "${ROOT}" -type f \
    -not -path "*/node_modules/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    -not -path "*/.git/*" \
    -not -name "*.log" \
    -not -name ".DS_Store" \
    > "${OUTDIR}/filelist.txt"
fi

# 3) архивируем (исключая тяжёлое/секреты)
(
  cd "${ROOT}"
  zip -r "${ARCHIVE}" . \
    -x "node_modules/*" \
    -x "dist/*" \
    -x "build/*" \
    -x ".git/*" \
    -x "*.log" \
    -x ".DS_Store" \
    -x ".env" \
    -x ".env.local" \
    -x ".env.*.local"
)

# 4) env-образец (редактируемый)
if [ -f "${ROOT}/.env" ]; then
  sed -E 's/=.*/=***REDACTED***/' "${ROOT}/.env" > "${OUTDIR}/.env.sample"
fi

# 5) зависимости / версии
(
  cd "${ROOT}"
  node -v  > "${OUTDIR}/node_version.txt" || true
  npm -v   > "${OUTDIR}/npm_version.txt"  || true
  npm ls --depth=0 > "${OUTDIR}/npm_ls_depth0.txt" || true
)

# 6) README экспорта
cat > "${OUTDIR}/README_EXPORT.md" <<EOF
Архив фронтенда: $(basename "${ARCHIVE}")
См. filelist.txt для списка включённых файлов.
Секреты из .env не включены; см. .env.sample (значения скрыты).
EOF

echo "✅ Frontend archive: ${ARCHIVE}"
echo "📝 Manifest: ${OUTDIR}"
