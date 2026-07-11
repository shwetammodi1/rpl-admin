#!/usr/bin/env bash
# check-inout.sh — show biometric IN/OUT punches from the RPL D1 database.
#
# Rolls raw punches (biometric_punches) into first-IN / last-OUT per person per
# day, in IST. Works for mapped and unmapped UserIDs alike.
#
# Usage:
#   ./tools/check-inout.sh                     # production, last 30 day-rows
#   ./tools/check-inout.sh --local             # local dev DB instead of production
#   ./tools/check-inout.sh --user 102          # only UserID 102
#   ./tools/check-inout.sh --date 2026-06-23   # only that day
#   ./tools/check-inout.sh --user 102 --date 2026-06-23
#   ./tools/check-inout.sh --limit 100         # more rows
#   ./tools/check-inout.sh --raw               # last raw webhook requests (debug log)
#
# Requires Node 22 (wrangler). This script loads nvm automatically if present.

set -euo pipefail

# --- Load nvm / Node 22 (wrangler needs >= 22) ---
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 && nvm use 22 >/dev/null 2>&1 || true

# --- Run from the repo root (so wrangler finds wrangler.toml) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# --- Defaults / arg parsing ---
LOC="--remote"        # production by default
ENVNAME="PRODUCTION"
USER_FILTER=""
DATE_FILTER=""
LIMIT="30"
MODE="inout"

while [ $# -gt 0 ]; do
  case "$1" in
    --local)  LOC="--local"; ENVNAME="LOCAL"; shift ;;
    --remote) LOC="--remote"; ENVNAME="PRODUCTION"; shift ;;
    --user)   USER_FILTER="${2:-}"; shift 2 ;;
    --date)   DATE_FILTER="${2:-}"; shift 2 ;;
    --limit)  LIMIT="${2:-30}"; shift 2 ;;
    --raw)    MODE="raw"; shift ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)"; exit 1 ;;
  esac
done

# IST conversion snippet reused in SQL.
IST="'unixepoch','+5 hours','+30 minutes'"

if [ "$MODE" = "raw" ]; then
  echo "== Last $LIMIT raw webhook requests ($ENVNAME) =="
  npx wrangler d1 execute rpl-admin $LOC --json --command \
    "SELECT datetime(received_at/1000,$IST) AS ist, endpoint, auth_ok, substr(raw,-220) AS body
     FROM biometric_debug ORDER BY received_at DESC LIMIT $LIMIT;" 2>/dev/null \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=(JSON.parse(s)[0]||{}).results||[];if(!r.length){console.log('(none)');return}for(const x of r){const m=(x.body||'').match(/body=([\s\S]*)/);console.log('•',x.ist,'IST  ['+x.endpoint+'] auth_ok='+x.auth_ok);console.log('   ',(m?m[1]:x.body).replace(/\s+/g,' ').slice(0,200));}})"
  exit 0
fi

# Build optional WHERE clause for the in/out summary.
WHERE=""
[ -n "$USER_FILTER" ] && WHERE="WHERE biometric_ref = '$USER_FILTER'"
if [ -n "$DATE_FILTER" ]; then
  COND="date(punch_time/1000,$IST) = '$DATE_FILTER'"
  if [ -n "$WHERE" ]; then WHERE="$WHERE AND $COND"; else WHERE="WHERE $COND"; fi
fi

echo "== IN/OUT summary ($ENVNAME)${USER_FILTER:+  user=$USER_FILTER}${DATE_FILTER:+  date=$DATE_FILTER} =="

npx wrangler d1 execute rpl-admin $LOC --json --command \
"SELECT biometric_ref AS UserID,
        date(punch_time/1000,$IST) AS day,
        MIN(CASE WHEN direction='in'  THEN time(punch_time/1000,$IST) END) AS in_time,
        MAX(CASE WHEN direction='out' THEN time(punch_time/1000,$IST) END) AS out_time,
        COUNT(*) AS punches
 FROM biometric_punches
 $WHERE
 GROUP BY UserID, day
 ORDER BY day DESC, UserID
 LIMIT $LIMIT;" 2>/dev/null \
| node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  const rows=((JSON.parse(s)[0])||{}).results||[];
  if(!rows.length){console.log('(no punches found)');return}
  console.log('UserID   | Date       | In       | Out      | #');
  console.log('---------+------------+----------+----------+----');
  for(const r of rows){
    console.log(String(r.UserID).padEnd(8),'|',r.day,'|',String(r.in_time||'—').padEnd(8),'|',String(r.out_time||'—').padEnd(8),'|',r.punches);
  }
  console.log('\\n'+rows.length+' row(s).');
});"
