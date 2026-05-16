#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/check-vultr.sh root@YOUR_VULTR_IP" >&2
  exit 1
fi

REMOTE="$1"

ssh "$REMOTE" bash -s <<'REMOTE_SCRIPT'
set -euo pipefail

echo "== host =="
hostname
date -Is

echo
echo "== docker compose ps =="
cd /opt/disburseguard
docker compose ps || true

echo
echo "== app logs tail =="
docker compose logs --tail=80 app || true

echo
echo "== listening ports =="
ss -ltnp || true

echo
echo "== local http checks =="
curl -fsS -m 5 -I http://127.0.0.1/ || true
curl -fsS -m 5 -I http://127.0.0.1:3000/ || true

echo
echo "== firewall =="
if command -v ufw >/dev/null 2>&1; then
  ufw status verbose || true
else
  echo "ufw not installed"
fi

echo
echo "== iptables summary =="
iptables -S INPUT 2>/dev/null || true
REMOTE_SCRIPT
