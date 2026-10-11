#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
origin='' base_path='' port='' nginx_config='' reset_password=0 skip_nginx=0 check_only=0
usage() {
  cat <<'HELP'
Milo: sudo ./deploy.sh
Options:
  --origin https://www.madeagents.ai  Public origin (no path)
  --path /milo                      Application path
  --port 3088                       Loopback-only application port
  --nginx-config /etc/nginx/...      Explicit existing server config
  --reset-password                  Set a new login password
  --skip-nginx                      Generate a snippet without installing it
  --check                           Check prerequisites/config only
Requires Linux, Docker Compose v2, Python 3, curl, and an existing Nginx
HTTPS server for www.madeagents.ai. No ChatGPT or Node.js installation needed.
HELP
}
while (($#)); do
  case "$1" in
    --origin|--path|--port|--nginx-config)
      (($# >= 2)) || { usage; exit 2; }
      case "$1" in --origin) origin=$2;; --path) base_path=$2;; --port) port=$2;; --nginx-config) nginx_config=$2;; esac
      shift 2;;
    --reset-password) reset_password=1; shift;;
    --skip-nginx) skip_nginx=1; shift;;
    --check) check_only=1; shift;;
    --help|-h) usage; exit 0;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; usage; exit 2;;
  esac
done
for command in docker python3 curl; do command -v "$command" >/dev/null || { printf 'Missing prerequisite: %s\n' "$command" >&2; exit 1; }; done
docker info >/dev/null 2>&1 || { echo 'Docker is not running or this user lacks Docker access.' >&2; exit 1; }
docker compose version >/dev/null || { echo 'Install Docker Compose v2 first.' >&2; exit 1; }
docker compose up --help | grep -q -- --wait || { echo 'Update Docker Compose: --wait support is required.' >&2; exit 1; }
sudo_cmd=()
if ((skip_nginx == 0)); then
  command -v nginx >/dev/null || { echo 'Nginx is not installed; use --skip-nginx to generate the snippet only.' >&2; exit 1; }
  if ((EUID != 0)); then command -v sudo >/dev/null || { echo 'Run with sudo to configure Nginx.' >&2; exit 1; }; sudo_cmd=(sudo); fi
fi
mkdir -p .deploy backups
chmod 700 .deploy backups
# An atomic directory lock protects credentials and deployment from concurrent runs.
mkdir .deploy/lock 2>/dev/null || { echo 'Another deployment is running. Remove .deploy/lock only after confirming it stopped.' >&2; exit 1; }
trap 'rmdir .deploy/lock 2>/dev/null || true' EXIT
read_setting() { python3 - "$1" "$2" <<'PY'
import json,sys
from pathlib import Path
p=Path('.deploy/config.json')
print(json.loads(p.read_text()).get(sys.argv[1],sys.argv[2]) if p.exists() else sys.argv[2])
PY
}
origin=${origin:-$(read_setting origin https://www.madeagents.ai)}
base_path=${base_path:-$(read_setting basePath /milo)}
port=${port:-$(read_setting port 3088)}
nginx_args=(--origin "$origin" --path "$base_path" --port "$port")
[[ -z "$nginx_config" ]] || nginx_args+=(--config "$nginx_config")
python3 scripts/install-nginx.py "${nginx_args[@]}" --generate-only
if ((skip_nginx == 0)); then "${sudo_cmd[@]}" python3 scripts/install-nginx.py "${nginx_args[@]}" --dry-run; fi
if ((check_only)); then echo 'Prerequisites and Nginx target verified; no service was deployed.'; exit 0; fi
if [[ ! -f .deploy/config.json ]] || ((reset_password)); then
  [[ -t 0 ]] || { echo 'First run/reset requires a terminal to enter your login password.' >&2; exit 1; }
  read -r -s -p 'Set Milo password (12–256 characters): ' milo_password; printf '\n'
  read -r -s -p 'Repeat password: ' milo_confirmation; printf '\n'
  [[ "$milo_password" == "$milo_confirmation" ]] || { echo 'Passwords do not match.' >&2; exit 1; }
else milo_password=''; fi
# Password travels through stdin only; only its salted hash is written to disk.
if [[ -f .deploy/config.json ]]; then cp .deploy/config.json .deploy/config.previous.json; cp .deploy/milo.env .deploy/milo.previous.env; fi
restore_config() { if [[ -f .deploy/config.previous.json ]]; then cp .deploy/config.previous.json .deploy/config.json; cp .deploy/milo.previous.env .deploy/milo.env; fi; }
printf '%s' "$milo_password" | docker run --rm -i --user "$(id -u):$(id -g)" -v "$PWD:/repo" -w /repo node:24-bookworm-slim node scripts/configure.mjs "$origin" "$base_path" "$port" "$reset_password"
unset milo_password milo_confirmation
compose=(docker compose --project-name milo --env-file .deploy/milo.env)
stamp=$(date -u +%Y%m%dT%H%M%SZ)
if [[ -n "$("${compose[@]}" ps --status running -q milo)" ]]; then
  "${compose[@]}" exec -T milo node scripts/backup.mjs "/app/data/backups/$stamp.sqlite"
  docker cp "$("${compose[@]}" ps -q milo):/app/data/backups/$stamp.sqlite" "backups/$stamp.sqlite"
  chmod 600 "backups/$stamp.sqlite"
fi
old_image=$(docker image inspect milo:current --format '{{.Id}}' 2>/dev/null || true)
[[ -z "$old_image" ]] || docker tag "$old_image" milo:previous
if ! "${compose[@]}" build --pull; then restore_config; echo 'Build failed; previous deployment/configuration retained.' >&2; exit 1; fi
if ! "${compose[@]}" up -d --no-build --wait --wait-timeout 180; then
  echo 'New application did not become healthy.' >&2
  restore_config
  if [[ -n "$old_image" ]]; then
    docker tag milo:previous milo:current
    "${compose[@]}" up -d --no-build --wait --wait-timeout 90 || true
    echo 'Previous application image restored; persistent data retained.' >&2
  fi
  exit 1
fi
curl --fail --silent --show-error "http://127.0.0.1:$port$base_path/api/health" >/dev/null
if ((skip_nginx == 0)); then
  "${sudo_cmd[@]}" python3 scripts/install-nginx.py "${nginx_args[@]}"
  # Use loopback with the real hostname; no DNS change is necessary.
  host=$(python3 - "$origin" <<'PY'
import sys,urllib.parse
print(urllib.parse.urlparse(sys.argv[1]).hostname)
PY
)
  public_port=443; [[ "$origin" == https://* ]] || public_port=80
  if ! curl --fail --silent --show-error --resolve "$host:$public_port:127.0.0.1" "$origin$base_path/api/health" >/dev/null; then
    echo 'Application is healthy locally, but the HTTPS route could not be verified. Inspect Nginx/certificate settings.' >&2; exit 1
  fi
  printf '\nMilo is ready: %s%s\n' "$origin" "$base_path"
else
  printf '\nApplication is healthy on 127.0.0.1:%s. Nginx snippet: .deploy/nginx-milo.conf\n' "$port"
fi
echo 'For updates: git pull --ff-only && sudo ./deploy.sh'
