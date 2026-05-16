#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/deploy-vultr.sh root@YOUR_VULTR_IP" >&2
  exit 1
fi

REMOTE="$1"
APP_DIR="/opt/disburseguard"
LOCAL_ENV=".env.local"

if [[ ! -f "$LOCAL_ENV" ]]; then
  echo "Missing .env.local. Create it locally before deploying." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$LOCAL_ENV"
set +a

if [[ -z "${OPENROUTER_API_KEY:-}" ]]; then
  echo "OPENROUTER_API_KEY is required for the current OpenRouter live extraction path." >&2
  exit 1
fi

if [[ -z "${SIGNING_PRIVATE_KEY_HEX:-}" ]]; then
  echo "SIGNING_PRIVATE_KEY_HEX is required for production-key packet signing." >&2
  exit 1
fi

REMOTE_POSTGRES_PASSWORD="$(
  ssh "$REMOTE" "test -f /opt/disburseguard/.env && sed -n 's/^POSTGRES_PASSWORD=//p' /opt/disburseguard/.env | head -n 1" 2>/dev/null || true
)"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-${REMOTE_POSTGRES_PASSWORD:-$(openssl rand -hex 24)}}"
OPENROUTER_MODEL="${OPENROUTER_MODEL:-google/gemini-2.5-flash}"
OPENROUTER_SITE_URL="${OPENROUTER_SITE_URL:-http://${REMOTE#*@}}"
OPENROUTER_APP_TITLE="${OPENROUTER_APP_TITLE:-DisburseGuard}"
GEMINI_MODE="${GEMINI_MODE:-openrouter}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"
X402_LIVE_SETTLEMENT="${X402_LIVE_SETTLEMENT:-false}"
RESET_DB_VOLUME="${RESET_DB_VOLUME:-false}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

git archive --format=tar HEAD > "$TMP_DIR/disburseguard.tar"

cat > "$TMP_DIR/production.env" <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
GEMINI_MODE=$GEMINI_MODE
GEMINI_API_KEY=${GEMINI_API_KEY:-}
GEMINI_MODEL=$GEMINI_MODEL
OPENROUTER_API_KEY=$OPENROUTER_API_KEY
OPENROUTER_MODEL=$OPENROUTER_MODEL
OPENROUTER_SITE_URL=$OPENROUTER_SITE_URL
OPENROUTER_APP_TITLE=$OPENROUTER_APP_TITLE
X402_LIVE_SETTLEMENT=$X402_LIVE_SETTLEMENT
SIGNING_PRIVATE_KEY_HEX=$SIGNING_PRIVATE_KEY_HEX
EOF

echo "Uploading DisburseGuard to $REMOTE..."
scp "$TMP_DIR/disburseguard.tar" "$REMOTE:/tmp/disburseguard.tar"
scp "$TMP_DIR/production.env" "$REMOTE:/tmp/disburseguard.env"

echo "Installing Docker and starting the app on $REMOTE..."
ssh "$REMOTE" "RESET_DB_VOLUME=$RESET_DB_VOLUME bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y ca-certificates curl git
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 22/tcp >/dev/null 2>&1 || true
fi

mkdir -p /opt/disburseguard
tar -xf /tmp/disburseguard.tar -C /opt/disburseguard
mv /tmp/disburseguard.env /opt/disburseguard/.env
chmod 600 /opt/disburseguard/.env

cd /opt/disburseguard
if [[ "${RESET_DB_VOLUME:-false}" == "true" ]]; then
  docker compose down -v
fi
docker compose up -d --build
docker compose ps
REMOTE_SCRIPT

echo
echo "Deployment command finished."
echo "Demo: http://${REMOTE#*@}/demo"
echo "Ledger: http://${REMOTE#*@}/ledger"
