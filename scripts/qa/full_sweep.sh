#!/usr/bin/env bash
#
# One full QA cycle from a clean database.
#
# Wipes the schema, restarts the API so Flyway migrates from scratch, then runs
# every suite: backend unit + Testcontainers integration, frontend unit, lint,
# production build, the two API suites, and the browser suite.
#
#     scripts/qa/full_sweep.sh [cycle-label]
#
# Exits non-zero if any suite fails.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LABEL="${1:-sweep}"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}"
# Docker Engine 29 rejects the API version docker-java negotiates by default.
export DOCKER_API_VERSION="${DOCKER_API_VERSION:-1.44}"

fail=0
declare -a RESULTS=()

step() {
  local name="$1"; shift
  echo ""
  echo "=================================================================="
  echo "== $name"
  echo "=================================================================="
  if "$@"; then
    RESULTS+=("PASS  $name")
  else
    RESULTS+=("FAIL  $name")
    fail=1
  fi
}

wipe_db() {
  docker exec assetmgmt-mysql mysql -uroot -proot \
    -e "DROP DATABASE IF EXISTS assetmgmt; CREATE DATABASE assetmgmt;" 2>/dev/null
}

restart_api() {
  pkill -f 'asset-management-api-1.0.0.jar' 2>/dev/null
  sleep 3
  cd "$ROOT/apps/api-kt" || return 1
  ./gradlew bootJar -q || return 1
  SPRING_PROFILES_ACTIVE=dev nohup "$JAVA_HOME/bin/java" \
    -jar build/libs/asset-management-api-1.0.0.jar > /tmp/qa-api-$LABEL.log 2>&1 &
  for _ in $(seq 1 60); do
    sleep 2
    if [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5115/api/v1/health)" = "200" ]; then
      return 0
    fi
  done
  echo "API did not come up; see /tmp/qa-api-$LABEL.log"
  tail -30 "/tmp/qa-api-$LABEL.log"
  return 1
}

# Serve the built bundle on the same port and run the browser suite against it.
# `vite preview` applies the real production header suite, including the CSP —
# which the dev server does not, so a CSP that blocks the app would otherwise
# only be discovered after deploying.
run_preview_suite() {
  local dev_pid preview_pid rc
  dev_pid="$(lsof -nP -iTCP:5173 -sTCP:LISTEN 2>/dev/null | awk 'NR>1{print $2}' | head -1)"
  [ -n "$dev_pid" ] && kill "$dev_pid" 2>/dev/null
  sleep 3

  cd "$ROOT/apps/web" || return 1
  npm run build > /tmp/qa-build-$LABEL.log 2>&1 || { tail -20 /tmp/qa-build-$LABEL.log; return 1; }
  nohup npm run preview > /tmp/qa-preview-$LABEL.log 2>&1 &
  preview_pid=$!
  for _ in $(seq 1 30); do
    sleep 2
    [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/)" = "200" ] && break
  done

  ./node_modules/.bin/playwright test --reporter=line
  rc=$?

  # Put the dev server back, so the user is left with the stack they had.
  kill "$preview_pid" 2>/dev/null
  sleep 2
  nohup npm run dev > /tmp/qa-dev-$LABEL.log 2>&1 &
  for _ in $(seq 1 30); do
    sleep 2
    [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/)" = "200" ] && break
  done
  return "$rc"
}

echo "### QA sweep [$LABEL] starting at $(date '+%Y-%m-%d %H:%M:%S')"

step "Wipe database"        wipe_db
step "Rebuild + restart API (Flyway migrates from clean)" restart_api
step "Backend tests"        bash -c "cd '$ROOT/apps/api-kt' && ./gradlew test"
step "Frontend unit tests"  bash -c "cd '$ROOT/apps/web' && npm run test -- --run"
step "Frontend lint"        bash -c "cd '$ROOT/apps/web' && npm run lint"
step "Frontend typecheck"   bash -c "cd '$ROOT/apps/web' && npx tsc --noEmit"
step "Frontend production build" bash -c "cd '$ROOT/apps/web' && npm run build"
step "API smoke suite"      bash -c "cd '$ROOT' && python3 scripts/qa/api_smoke.py"
step "API deep suite"       bash -c "cd '$ROOT' && python3 scripts/qa/api_deep.py"
step "Browser suite (dev server)" bash -c "cd '$ROOT/apps/web' && ./node_modules/.bin/playwright test --reporter=line"
step "Browser suite (production build)" run_preview_suite

echo ""
echo "=================================================================="
echo "== QA sweep [$LABEL] summary"
echo "=================================================================="
printf '%s\n' "${RESULTS[@]}"
echo ""
if [ "$fail" -eq 0 ]; then
  echo "ALL SUITES PASSED"
else
  echo "SOME SUITES FAILED"
fi
exit "$fail"
