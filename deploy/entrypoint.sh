#!/bin/sh
set -eu

# HTTP basic auth credentials for the /api/ reverse proxy.
# Both are overridable. If PLANNER_AUTH_PASSWORD is unset, a random one is
# generated and printed to the container logs on every start.
PLANNER_AUTH_USER="${PLANNER_AUTH_USER:-planner}"
if [ -z "${PLANNER_AUTH_PASSWORD:-}" ]; then
  PLANNER_AUTH_PASSWORD="$(openssl rand -base64 24)"
  echo "============================================================"
  echo " planner: generated PM API basic-auth credentials"
  echo "   user:     ${PLANNER_AUTH_USER}"
  echo "   password: ${PLANNER_AUTH_PASSWORD}"
  echo " Set PLANNER_AUTH_USER / PLANNER_AUTH_PASSWORD to choose your own."
  echo "============================================================"
fi
printf '%s:%s\n' "${PLANNER_AUTH_USER}" "$(openssl passwd -apr1 "${PLANNER_AUTH_PASSWORD}")" > /etc/nginx/htpasswd

# PM server: bound to 127.0.0.1 by the application itself; only reachable
# through the authenticated nginx proxy inside this container (or, optionally,
# via the loopback-only host port published by docker compose).
node /app/pm-server/dist/pmServe.js &
PM_PID=$!

# If the PM server dies, bring nginx down too so the container restarts clean.
term() { kill -TERM "$NGINX_PID" "$PM_PID" 2>/dev/null || true; exit 1; }
trap 'exit 143' TERM INT

nginx -g 'daemon off;' &
NGINX_PID=$!

while kill -0 "$PM_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
  sleep 1
done
echo "planner: a critical process exited; shutting down" >&2
term
