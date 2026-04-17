#!/usr/bin/env bash
# ============================================================================
# SEO-GEO — Deploy script to VPS Wyzlee
#
# Usage :
#   ./scripts/deploy.sh                  # standard : build + push + remote pull + up -d + healthcheck
#   ./scripts/deploy.sh --rollback       # reverse : revient au tag `previous` sur le VPS
#   ./scripts/deploy.sh --skip-build     # skip build local (si l'image est déjà sur le registry)
#   DEPLOY_HOST=vps.wyzlee.cloud ./scripts/deploy.sh   # override host
#
# Prérequis :
#   - VPS accessible en SSH (config dans ~/.ssh/config ou DEPLOY_HOST env)
#   - docker + docker-compose installés sur VPS, réseau `traefik` existant
#   - Fichier `.env.production` déposé sur le VPS en /srv/seo-geo/.env (chmod 600)
# ============================================================================

set -euo pipefail

# ---- Config ----------------------------------------------------------------
DEPLOY_HOST="${DEPLOY_HOST:-seo-geo.wyzlee.cloud}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/srv/seo-geo}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-https://seo-geo.wyzlee.cloud/api/health}"
HEALTHCHECK_TIMEOUT_SEC="${HEALTHCHECK_TIMEOUT_SEC:-60}"

# ---- Colors ----------------------------------------------------------------
RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; BOLD=$'\e[1m'; RESET=$'\e[0m'

log()  { printf '%s[deploy]%s %s\n' "$BOLD" "$RESET" "$*"; }
ok()   { printf '%s[deploy]%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%s[deploy]%s %s\n' "$YELLOW" "$RESET" "$*"; }
fail() { printf '%s[deploy]%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }

# ---- Parse flags -----------------------------------------------------------
MODE="deploy"
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --rollback)   MODE="rollback" ;;
    --skip-build) SKIP_BUILD=1 ;;
    *) fail "Argument inconnu : $arg" ;;
  esac
done

# ---- Sanity checks ---------------------------------------------------------
[[ -f docker-compose.yml ]] || fail "À lancer depuis la racine du repo."
command -v ssh >/dev/null || fail "ssh manquant."
command -v rsync >/dev/null || fail "rsync manquant."

SSH_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"

# ---- Rollback mode ---------------------------------------------------------
if [[ "$MODE" == "rollback" ]]; then
  warn "Rollback : restauration de l'image précédente sur $DEPLOY_HOST"
  ssh "$SSH_TARGET" "cd $DEPLOY_PATH && docker compose pull && docker tag seo-geo-app:previous seo-geo-app:current || true && docker compose up -d --no-build"
  ok "Rollback lancé. Vérifier healthcheck : $HEALTHCHECK_URL"
  exit 0
fi

# ---- Pre-flight checks -----------------------------------------------------
log "1/6 — checks locaux (lint + typecheck + tests)"
if [[ "$SKIP_BUILD" -eq 0 ]]; then
  npm run lint
  npx tsc --noEmit
  npx vitest run
  ok "Checks locaux ✓"
else
  warn "Checks locaux SKIPPED (--skip-build)"
fi

# ---- Build ----------------------------------------------------------------
log "2/6 — build image Docker"
if [[ "$SKIP_BUILD" -eq 0 ]]; then
  docker compose build app worker
  ok "Images build ✓"
else
  warn "Build SKIPPED"
fi

# ---- Sync compose + migrations --------------------------------------------
log "3/6 — rsync docker-compose + scripts + drizzle"
rsync -av --delete \
  --exclude='.env.local' --exclude='.env.production' \
  --exclude='node_modules' --exclude='.next' --exclude='.git' \
  docker-compose.yml \
  Dockerfile worker/ \
  drizzle/ drizzle.config.ts \
  scripts/ \
  "$SSH_TARGET:$DEPLOY_PATH/"
ok "Files rsync ✓"

# ---- Apply migrations en amont (branche dev Neon validée avant) -----------
log "4/6 — applique les migrations Drizzle sur la prod"
ssh "$SSH_TARGET" "cd $DEPLOY_PATH && docker compose run --rm app npx drizzle-kit push --config=drizzle.config.ts" || \
  fail "Migration Drizzle échouée. Vérifier logs."
ok "Migrations ✓"

# ---- Pull + up -d ---------------------------------------------------------
log "5/6 — redémarre les services (app + worker + gotenberg)"
ssh "$SSH_TARGET" "cd $DEPLOY_PATH && docker compose up -d --build"
ok "Services up ✓"

# ---- Healthcheck ----------------------------------------------------------
log "6/6 — attente du healthcheck ($HEALTHCHECK_URL, ${HEALTHCHECK_TIMEOUT_SEC}s)"
start_ts=$(date +%s)
while true; do
  if curl -fsS "$HEALTHCHECK_URL" >/dev/null 2>&1; then
    ok "Healthcheck OK ✓"
    break
  fi
  now_ts=$(date +%s)
  elapsed=$((now_ts - start_ts))
  if [[ "$elapsed" -ge "$HEALTHCHECK_TIMEOUT_SEC" ]]; then
    warn "Healthcheck timeout après ${HEALTHCHECK_TIMEOUT_SEC}s."
    warn "Log du conteneur pour diagnostic :"
    ssh "$SSH_TARGET" "cd $DEPLOY_PATH && docker compose logs --tail=50 app" || true
    fail "Déploiement échoué. Rollback avec : $0 --rollback"
  fi
  sleep 2
done

ok "Déploiement terminé — https://seo-geo.wyzlee.cloud"
