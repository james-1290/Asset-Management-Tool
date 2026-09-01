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
# Testcontainers 2.x negotiates the Docker API version correctly, so this is no
# longer needed; honoured only if the caller sets it (older daemons).
[ -n "${DOCKER_API_VERSION:-}" ] && export DOCKER_API_VERSION

# Where the API records the routes it actually serves, so endpoint coverage can
# be measured rather than assumed.
COVERAGE_FILE="/tmp/qa-endpoint-coverage-$LABEL.txt"

# A full cycle runs for tens of minutes. If the machine sleeps partway through,
# Chromium fails with ERR_NETWORK_IO_SUSPENDED / ERR_NETWORK_CHANGED and the
# browser specs time out — producing a different set of "failures" on every run
# that look like real defects and are not. Re-exec under caffeinate so the
# machine stays awake for the duration.
if [[ "$(uname)" == "Darwin" && -z "${QA_CAFFEINATED:-}" ]] && command -v caffeinate >/dev/null; then
  export QA_CAFFEINATED=1
  exec caffeinate -dimsu "$0" "$@"
fi

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
  rm -f "$COVERAGE_FILE"
  local agent=""
  if [ -f /tmp/jacoco-agent/jacocoagent.jar ]; then
    rm -f /tmp/jacoco-api.exec
    agent="-javaagent:/tmp/jacoco-agent/jacocoagent.jar=destfile=/tmp/jacoco-api.exec,output=file,append=false"
  fi
  SPRING_PROFILES_ACTIVE=dev nohup "$JAVA_HOME/bin/java" \
    ${agent:+$agent} \
    "-Dendpoint.coverage.file=$COVERAGE_FILE" \
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
step "Frontend dead code"   bash -c "cd '$ROOT/apps/web' && npm run deadcode"
# `tsc --noEmit` (without -b) compiled *nothing* here and always exited 0: the
# root tsconfig.json is solution-style, listing only `references`, so there are
# no files to check without building the referenced projects. This step passed
# on a deliberate type error until it was tested.
step "Frontend typecheck"   bash -c "cd '$ROOT/apps/web' && npx tsc -b --noEmit"
step "Frontend production build" bash -c "cd '$ROOT/apps/web' && npm run build"
step "API smoke suite"      bash -c "cd '$ROOT' && python3 scripts/qa/api_smoke.py"
step "API deep suite"       bash -c "cd '$ROOT' && python3 scripts/qa/api_deep.py"
step "Browser suite (dev server)" bash -c "cd '$ROOT/apps/web' && ./node_modules/.bin/playwright test --reporter=line"
step "Browser suite (production build)" run_preview_suite

step "GUI inventory + coverage (every control named by a spec)" \
  bash -c "cd '$ROOT/apps/web' && ./node_modules/.bin/playwright test e2e/qa/inventory.spec.ts --reporter=line && cd '$ROOT' && python3 scripts/qa/gui_coverage.py"

step "Endpoint coverage (every route reached by a suite)" \
  bash -c "cd '$ROOT' && python3 scripts/qa/endpoint_coverage.py '$COVERAGE_FILE'"

if [ -f /tmp/jacoco-agent/jacocoagent.jar ]; then
  echo ""
  echo "=================================================================="
  echo "== Code coverage (reported, not gated)"
  echo "=================================================================="
  # The agent writes its execution file when the JVM exits, so the API has to
  # be stopped before the report is generated — reading it while the app is
  # still running yields the test JVM's figures only, which understate the
  # controllers badly.
  pkill -f 'asset-management-api-1.0.0.jar' 2>/dev/null
  for _ in $(seq 1 20); do
    [ -s /tmp/jacoco-api.exec ] && break
    sleep 1
  done
  (cd "$ROOT/apps/api-kt" && ./gradlew jacocoRuntimeReport -q 2>/dev/null) || true
  python3 "$ROOT/scripts/qa/coverage_summary.py" || true

  # Leave the stack as it was found.
  echo ""
  echo "-- restarting the API --"
  restart_api > /dev/null && echo "API back up"
fi

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
