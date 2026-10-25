#!/usr/bin/env bash
# Manage JMPLNK.uk short links from WinX (Git Bash) with the VPN on. The admin token stays on
# the hub: each command runs curl there against the local container.
#
#   ./link.sh add <url> [code]          make a short link (random code if none given)
#   ./link.sh list                      show every link with its visit count
#   ./link.sh move <code> <url>         point an existing link somewhere new
#   ./link.sh off <code>                stop a link working
#   ./link.sh on <code>                 turn it back on
#   ./link.sh stats <code>              visits and referring sites for one link
#
# HOST=other ./link.sh ... uses another ssh host (default: network).
set -euo pipefail

HOST=${HOST:-network}

api() { # method path [json]
  local body=""
  [ $# -ge 3 ] && body=$(printf '%q' "$3")
  ssh "$HOST" "set -a; . ~/jmplnk/.env; set +a; curl -sS -X $1 http://localhost:8083$2 \
    -H \"Authorization: Bearer \$ADMIN_TOKEN\" -H 'Content-Type: application/json' ${body:+--data $body}; echo"
}

json() { # key value ... -> {"key":"value",...}; true/false stay booleans
  local out="" k v
  while [ $# -ge 2 ]; do
    k=$1 v=$2; shift 2
    if [ "$v" != true ] && [ "$v" != false ]; then
      v=${v//\\/\\\\}; v=${v//\"/\\\"}; v="\"$v\""
    fi
    out+="${out:+,}\"$k\":$v"
  done
  printf '{%s}' "$out"
}

case "${1:-}" in
  add)   [ $# -ge 2 ] || { echo "usage: $0 add <url> [code]" >&2; exit 1; }
         if [ $# -ge 3 ]; then api POST /api/shorten "$(json url "$2" shortCode "$3")"
         else api POST /api/shorten "$(json url "$2")"; fi ;;
  list)  api GET "/api/links?limit=1000" ;;
  move)  [ $# -eq 3 ] || { echo "usage: $0 move <code> <url>" >&2; exit 1; }
         api PATCH "/api/shorten/$2" "$(json url "$3")" ;;
  off)   [ $# -eq 2 ] || { echo "usage: $0 off <code>" >&2; exit 1; }
         api DELETE "/api/shorten/$2" ;;
  on)    [ $# -eq 2 ] || { echo "usage: $0 on <code>" >&2; exit 1; }
         api PATCH "/api/shorten/$2" "$(json isActive true)" ;;
  stats) [ $# -eq 2 ] || { echo "usage: $0 stats <code>" >&2; exit 1; }
         api GET "/api/stats/$2" ;;
  *)     sed -n '2,13p' "$0"; exit 1 ;;
esac
