#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repo=$PWD
origin='' base_path='' port='' nginx_config='' install_dir=/opt/milo
reset_password=0 skip_nginx=0 check_only=0
usage() {
  cat <<'HELP'
Milo source deployment: sudo ./deploy.sh
Options:
  --origin https://www.madeagents.ai  Public origin (no path)
  --path /milo                      Application path
  --port 3088                       Loopback application port
  --install-dir /opt/milo           Releases and persistent data
  --nginx-config /etc/nginx/...      Existing enabled server config
  --reset-password                  Set a new login password
  --skip-nginx                      Start service; generate Nginx snippet only
  --check                           Check prerequisites/config only
Requires Linux with systemd, Python 3, curl, tar/xz, and existing Nginx HTTPS.
Node.js 24 is installed privately if no suitable system Node.js is available.
HELP
}
die() { echo "ERROR: $*" >&2; exit 1; }
while (($#)); do
  case "$1" in
    --origin|--path|--port|--nginx-config|--install-dir)
      (($# >= 2)) || { usage; exit 2; }
      case "$1" in --origin) origin=$2;; --path) base_path=$2;; --port) port=$2;; --nginx-config) nginx_config=$2;; --install-dir) install_dir=$2;; esac
      shift 2;;
    --reset-password) reset_password=1; shift;;
    --skip-nginx) skip_nginx=1; shift;;
    --check) check_only=1; shift;;
    --help|-h) usage; exit 0;;
    *) usage; die "Unknown argument: $1";;
  esac
done
[[ $(uname -s) == Linux ]] || die 'Deployment requires a Linux server with systemd.'
((EUID == 0)) || die 'Run sudo ./deploy.sh to install the service and Nginx route.'
for command in python3 curl tar xz sha256sum systemctl runuser useradd getent flock install readlink; do
  command -v "$command" >/dev/null || die "Missing prerequisite: $command"
done
[[ -d /run/systemd/system ]] || die 'systemd must be running on this server.'
install_dir=${install_dir%/}
[[ "$install_dir" =~ ^/(opt|srv)/[a-zA-Z0-9_/-]+$ && "$install_dir" != *'//'* ]] || die 'Use a directory under /opt or /srv without spaces.'
if ((skip_nginx == 0)); then command -v nginx >/dev/null || die 'Nginx is not installed.'; fi
unit=/etc/systemd/system/milo.service
if [[ -e "$unit" ]]; then
  grep -Fxq '# Managed by Milo deploy.sh' "$unit" && grep -Fxq "# Milo install directory: $install_dir" "$unit" || die 'Existing milo.service belongs to another installation.'
fi
[[ ! -e "$install_dir/current" || -f "$install_dir/.milo-install" ]] || die 'Install directory contains an unmanaged current release.'
exec 9>/run/lock/milo-deploy.lock
flock -n 9 || die 'Another Milo deployment is running.'
config_dir=$install_dir/shared/.deploy
data_dir=$install_dir/shared/data
database=$data_dir/milo.sqlite
read_setting() { python3 - "$config_dir/config.json" "$1" "$2" <<'PY'
import json,sys
from pathlib import Path
p=Path(sys.argv[1])
print(json.loads(p.read_text()).get(sys.argv[2],sys.argv[3]) if p.exists() else sys.argv[3])
PY
}
origin=${origin:-$(read_setting origin https://www.madeagents.ai)}
base_path=${base_path:-$(read_setting basePath /milo)}
port=${port:-$(read_setting port 3088)}
nginx_args=(--origin "$origin" --path "$base_path" --port "$port")
[[ -z "$nginx_config" ]] || nginx_args+=(--config "$nginx_config")
mkdir -p .deploy; chmod 700 .deploy
python3 scripts/install-nginx.py "${nginx_args[@]}" --generate-only
if ((skip_nginx == 0)); then python3 scripts/install-nginx.py "${nginx_args[@]}" --dry-run; fi
if ((check_only)); then
  echo "Prerequisites verified. Source deployment to $install_dir; Node.js 24 will be prepared if needed."
  exit 0
fi
if [[ ! -f "$config_dir/config.json" ]] || ((reset_password)); then
  [[ -t 0 ]] || die 'First run/reset requires a terminal for your login password.'
  read -r -s -p 'Set Milo password (12–256 characters): ' milo_password; printf '\n'
  read -r -s -p 'Repeat password: ' milo_confirmation; printf '\n'
  [[ "$milo_password" == "$milo_confirmation" ]] || die 'Passwords do not match.'
  ((${#milo_password} >= 12 && ${#milo_password} <= 256)) || die 'Password must have 12–256 characters.'
else milo_password=''; fi
install -d -m 755 "$install_dir" "$install_dir/releases" "$install_dir/runtime"
if ! getent passwd milo >/dev/null; then useradd --system --user-group --home-dir "$install_dir/shared" --shell /usr/sbin/nologin milo; fi
[[ $(id -u milo) != 0 ]] || die 'The milo service user must not be root.'
getent group milo >/dev/null || die 'The existing milo user must have a milo group.'
install -d -m 750 -o root -g milo "$install_dir/shared"
install -d -m 700 -o milo -g milo "$data_dir" "$install_dir/shared/npm-cache"
install -d -m 700 "$config_dir" "$install_dir/shared/backups"
touch "$install_dir/.milo-install"
stamp=$(date -u +%Y%m%dT%H%M%SZ)-$$
transaction=$(mktemp -d "$config_dir/transaction.XXXXXX")
release=$install_dir/releases/$stamp
build=$release/build
old_release=$(readlink -f "$install_dir/current" 2>/dev/null || true)
[[ -d "$old_release" ]] || old_release=''
had_unit=0; had_config=0; had_enabled=0; switched=0; success=0
if systemctl is-enabled --quiet milo.service; then had_enabled=1; fi
if [[ -f "$unit" ]]; then cp "$unit" "$transaction/old.service"; had_unit=1; fi
if [[ -f "$config_dir/config.json" ]]; then
  cp "$config_dir/config.json" "$transaction/old.json"; cp "$config_dir/milo.env" "$transaction/old.env"; had_config=1
fi
set_current() { ln -s "$1" "$install_dir/.current-$$"; mv -Tf "$install_dir/.current-$$" "$install_dir/current"; }
finish() {
  status=$?
  trap - EXIT
  set +e
  unset milo_password milo_confirmation
  if ((success == 0 && switched)); then
    echo 'Deployment failed; restoring previous release and configuration.' >&2
    systemctl stop milo.service
    if ((had_enabled == 0)); then systemctl disable milo.service; fi
    if [[ -n "$old_release" ]]; then set_current "$old_release"; else rm -f "$install_dir/current"; fi
    if ((had_config)); then
      install -m 600 "$transaction/old.json" "$config_dir/config.json"; install -m 600 "$transaction/old.env" "$config_dir/milo.env"
    else rm -f "$config_dir/config.json" "$config_dir/milo.env"; fi
    if ((had_unit)); then install -m 644 "$transaction/old.service" "$unit"; else rm -f "$unit"; fi
    systemctl daemon-reload
    if [[ -n "$old_release" ]] && ((had_unit)); then systemctl reset-failed milo.service; systemctl start milo.service; fi
  fi
  rm -f "$install_dir/.current-$$"
  [[ -z "${download_dir:-}" ]] || rm -rf -- "$download_dir"
  rm -rf -- "$transaction"
  if ((success == 0)) && [[ $(readlink -f "$install_dir/current" 2>/dev/null) != "$release" ]]; then rm -rf -- "$release"; fi
  exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
node_bin=''
node_works() { "$1" -e 'if(Number(process.versions.node.split(".")[0])<24)process.exit(1);require("node:sqlite").DatabaseSync' >/dev/null 2>&1; }
if command -v node >/dev/null; then
  candidate=$(readlink -f "$(command -v node)")
  case "$candidate" in /usr/*|/opt/*|/bin/*)
    if node_works "$candidate" && runuser -u milo -- "$candidate" -e 'require("node:sqlite").DatabaseSync' >/dev/null 2>&1; then node_bin=$candidate; fi;;
  esac
fi
if [[ -z "$node_bin" && -x "$install_dir/runtime/node/bin/node" ]] && node_works "$install_dir/runtime/node/bin/node"; then node_bin=$install_dir/runtime/node/bin/node; fi
if [[ -z "$node_bin" ]]; then
  case $(uname -m) in x86_64) arch=x64;; aarch64|arm64) arch=arm64;; *) die 'Automatic Node.js installation supports Linux x64/arm64.';; esac
  download_dir=$(mktemp -d "$install_dir/runtime/download.XXXXXX")
  curl --fail --location --silent --show-error --retry 3 --connect-timeout 15 --max-time 120 https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o "$download_dir/SHASUMS256.txt"
  archive=$(awk -v suffix="-linux-$arch.tar.xz" '$2 ~ /^node-v24\.[0-9]+\.[0-9]+-/ && substr($2,length($2)-length(suffix)+1)==suffix { print $2 }' "$download_dir/SHASUMS256.txt")
  [[ "$archive" =~ ^node-v24\.[0-9]+\.[0-9]+-linux-(x64|arm64)\.tar\.xz$ ]] || die 'Could not identify the official Node.js 24 download.'
  version=${archive#node-}; version=${version%%-linux-*}
  curl --fail --location --silent --show-error --retry 3 --connect-timeout 15 --max-time 600 "https://nodejs.org/dist/$version/$archive" -o "$download_dir/$archive"
  (cd "$download_dir"; awk -v name="$archive" '$2 == name' SHASUMS256.txt | sha256sum -c -)
  mkdir "$download_dir/extracted"
  tar -xJf "$download_dir/$archive" -C "$download_dir/extracted" --strip-components=1
  node_works "$download_dir/extracted/bin/node" || die 'Node.js 24 could not run; use a supported glibc Linux distribution.'
  [[ ! -e "$install_dir/runtime/node" ]] || die 'Existing private runtime is invalid; inspect it before replacing it.'
  mv "$download_dir/extracted" "$install_dir/runtime/node"
  chmod -R a+rX "$install_dir/runtime/node"
  node_bin=$install_dir/runtime/node/bin/node
fi
node_dir=$(dirname "$node_bin")
[[ -x "$node_dir/npm" ]] || die "npm must be installed beside $node_bin"
# Only source inputs enter the build directory; credentials/databases are excluded.
install -d -m 755 "$release" "$build"
tar --exclude='__pycache__' --exclude='*.pyc' -cf - app lib public scripts package.json package-lock.json next.config.ts postcss.config.mjs tsconfig.json | tar -xf - -C "$build"
chown -R milo:milo "$release"
echo 'Installing locked dependencies and building source...'
runuser -u milo -- env PATH="$node_dir:/usr/local/bin:/usr/bin:/bin" HOME="$install_dir/shared" npm_config_cache="$install_dir/shared/npm-cache" npm_config_update_notifier=false \
  bash -c 'set -e; umask 022; cd "$1"; npm ci --include=dev --no-audit --no-fund; NEXT_PUBLIC_BASE_PATH="$2" NEXT_TELEMETRY_DISABLED=1 npm run build' bash "$build" "$base_path"
"$node_bin" scripts/assemble-release.mjs "$build" "$release"
rm -rf -- "$build"
chown -R root:root "$release"; chmod -R a+rX "$release"
mkdir "$transaction/new"
if ((had_config)); then cp "$transaction/old.json" "$transaction/new/config.json"; fi
printf '%s' "$milo_password" | "$node_bin" scripts/configure.mjs "$origin" "$base_path" "$port" "$reset_password" "$transaction/new" "$database"
unset milo_password milo_confirmation
if [[ -f "$database" ]]; then
  DATABASE_PATH="$database" "$node_bin" scripts/backup.mjs "$install_dir/shared/backups/$stamp.sqlite"
fi
python3 scripts/systemd-unit.py "$install_dir" "$node_bin" "$stamp" > "$transaction/new.service"
if command -v systemd-analyze >/dev/null; then systemd-analyze verify "$transaction/new.service"; fi
# Commit the candidate only after build/configuration/backup have succeeded.
switched=1
install -m 600 "$transaction/new/config.json" "$config_dir/config.json"
install -m 600 "$transaction/new/milo.env" "$config_dir/milo.env"
set_current "$release"
install -m 644 "$transaction/new.service" "$unit"
systemctl daemon-reload
systemctl reset-failed milo.service >/dev/null 2>&1 || true
systemctl restart milo.service
healthy=0
for ((attempt=0; attempt<60; attempt++)); do
  if systemctl is-active --quiet milo.service && curl --fail --silent --max-time 2 "http://127.0.0.1:$port$base_path/api/health" | python3 -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("release")==sys.argv[1] else 1)' "$stamp" 2>/dev/null; then healthy=1; break; fi
  sleep 1
done
((healthy)) || { journalctl -u milo.service -n 30 --no-pager >&2 || true; die 'New service failed its health check.'; }
systemctl enable milo.service
# Route installer restores its original files if Nginx validation/reload fails.
if ((skip_nginx == 0)); then python3 scripts/install-nginx.py "${nginx_args[@]}"; fi
success=1
if ((skip_nginx == 0)); then
  host=$(python3 - "$origin" <<'PY'
import sys,urllib.parse
print(urllib.parse.urlparse(sys.argv[1]).hostname)
PY
)
  public_port=443; [[ "$origin" == https://* ]] || public_port=80
  curl --fail --silent --show-error --max-time 15 --resolve "$host:$public_port:127.0.0.1" "$origin$base_path/api/health" >/dev/null || die 'Service is healthy, but the public route could not be verified; inspect Nginx/TLS. The running release was retained.'
  printf '\nMilo is ready: %s%s\n' "$origin" "$base_path"
else
  printf '\nMilo is healthy on 127.0.0.1:%s. Nginx snippet: %s/.deploy/nginx-milo.conf\n' "$port" "$repo"
fi
echo 'Updates: git pull --ff-only && sudo ./deploy.sh'
echo 'Service status: systemctl status milo; logs: journalctl -u milo -f'
