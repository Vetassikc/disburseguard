# Vultr VM Deployment

This guide keeps the hackathon deployment small: one Vultr VM runs the Next.js app and PostgreSQL with Docker Compose.

## VM shape

Use the smallest practical Cloud Compute instance first. Do not enable backups, block storage, Kubernetes, managed database, or GPU services for the initial demo.

## Server setup

SSH into the VM and install Docker:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back in so the Docker group is applied.

## App deploy

Clone the public repository, then create the production environment file:

```bash
git clone https://github.com/your-org/disburseguard.git
cd disburseguard
cp .env.production.example .env
```

Edit `.env` on the server. Keep real values out of git.

Required values:

- `POSTGRES_PASSWORD`: long random password.
- `SIGNING_PRIVATE_KEY_HEX`: 64 hex characters. Generate with `openssl rand -hex 32`.
- `GEMINI_MODE`: use `fixture` for deterministic judging, or `live` when `GEMINI_API_KEY` is set.
- `GEMINI_API_KEY`: Gemini API key, only if live mode is enabled.

Start the app:

```bash
docker compose up -d --build
docker compose logs -f app
```

The demo should be available at:

```text
http://YOUR_VULTR_IP:3000/demo
```

The ledger should be available at:

```text
http://YOUR_VULTR_IP:3000/ledger
```

## Verification

Run these after deploy:

```bash
curl -i http://127.0.0.1:3000/api/payout-intents
curl -i -X POST http://127.0.0.1:3000/api/proofs/vendor-risk \
  -H 'content-type: application/json' \
  -d '{"scenarioId":"limit"}'
curl -i -X POST http://127.0.0.1:3000/api/clearance/run \
  -H 'content-type: application/json' \
  -d '{"scenarioId":"limit"}'
```

The unpaid proof request should return HTTP 402. The clearance run should return a signed packet and a verification URL.

## Cost control

For Vultr billing safety, destroy the instance when you no longer need it. Stopped instances can still be billed.
