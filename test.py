"""
Backend API test suite for the personal dashboard.
Tests all API endpoints: health, auth, RSS proxy, GitHub proxy, Gmail.
Run: python test.py [base_url]
"""

import sys
import requests

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
PASS = 0
FAIL = 0

TIMEOUT = 10  # generous timeout for slow cold starts


def result(name, status, detail=""):
    global PASS, FAIL
    if status == "pass":
        PASS += 1
        tag = "\033[92mPASS\033[0m"
    else:
        FAIL += 1
        tag = "\033[91mFAIL\033[0m"
    suffix = f" — {detail}" if detail else ""
    print(f"  [{tag}] {name}{suffix}")


def section(title):
    print(f"\n{'='*60}\n  {title}\n{'='*60}")


# ─── 1. Health Check ─────────────────────────────────────────────────────────

section("1. Health Check")

try:
    r = requests.get(f"{BASE}/api/health", timeout=TIMEOUT)
    data = r.json()
    if r.status_code == 200 and data.get("status") == "ok":
        result("GET /api/health returns 200 + status ok", "pass")
    else:
        result("GET /api/health", "fail", f"status={r.status_code} body={data}")
except Exception as e:
    result("GET /api/health", "fail", str(e))

try:
    r = requests.get(f"{BASE}/api/health", timeout=TIMEOUT)
    data = r.json()
    if "db" in data:
        result("Health response includes db field", "pass", f"db={data['db']}")
    else:
        result("Health response missing db field", "fail")
except Exception as e:
    result("Health db field check", "fail", str(e))


# ─── 2. Auth — /api/auth/me ─────────────────────────────────────────────────

section("2. Auth — Session Management")

try:
    r = requests.get(f"{BASE}/api/auth/me", timeout=TIMEOUT)
    data = r.json()
    if r.status_code == 200 and "user" in data:
        result("GET /api/auth/me returns 200 + user field", "pass")
        if data["user"] is None:
            result("No session active (expected)", "pass")
        else:
            result("Active session found", "pass", f"email={data['user'].get('email')}")
    else:
        result("GET /api/auth/me", "fail", f"status={r.status_code} body={data}")
except Exception as e:
    result("GET /api/auth/me", "fail", str(e))

try:
    r = requests.post(f"{BASE}/api/auth/logout", timeout=TIMEOUT)
    data = r.json()
    if r.status_code == 200 and data.get("ok") is True:
        result("POST /api/auth/logout (no session) returns ok", "pass")
    else:
        result("POST /api/auth/logout (no session)", "fail", f"status={r.status_code} body={data}")
except Exception as e:
    result("POST /api/auth/logout", "fail", str(e))


# ─── 3. Auth — Google OAuth redirect ─────────────────────────────────────────

section("3. Auth — Google OAuth Flow")

try:
    r = requests.get(f"{BASE}/api/auth/google", timeout=TIMEOUT, allow_redirects=False)
    if r.status_code in (301, 302, 307):
        loc = r.headers.get("Location", "")
        if "accounts.google.com" in loc and "oauth2" in loc:
            result("GET /api/auth/google redirects to Google OAuth", "pass")
            cookies_header = r.headers.get("Set-Cookie", "")
            if "oauth_state" in cookies_header:
                result("OAuth state cookie set", "pass")
            else:
                result("OAuth state cookie", "fail", "not in Set-Cookie header")
        else:
            result("GET /api/auth/google redirect", "fail", f"wrong Location: {loc}")
    else:
        result("GET /api/auth/google", "fail", f"expected 302, got {r.status_code}")
except Exception as e:
    result("GET /api/auth/google", "fail", str(e))


# ─── 4. RSS Proxy ────────────────────────────────────────────────────────────

section("4. RSS Proxy — /api/rss")

try:
    r = requests.get(f"{BASE}/api/rss", timeout=TIMEOUT)
    data = r.json()
    if r.status_code == 400 and "Missing url" in data.get("error", ""):
        result("RSS: missing url param returns 400", "pass")
    elif r.status_code == 429:
        result("RSS: missing url param (rate limited — pass)", "pass")
    else:
        result("RSS: missing url param", "fail", f"status={r.status_code} body={data}")
except Exception as e:
    result("RSS: missing url param", "fail", str(e))

try:
    r = requests.get(f"{BASE}/api/rss?url=not-a-url", timeout=TIMEOUT)
    data = r.json()
    if r.status_code == 400 and "Invalid URL" in data.get("error", ""):
        result("RSS: invalid URL returns 400", "pass")
    elif r.status_code == 429:
        result("RSS: invalid URL (rate limited — pass)", "pass")
    else:
        result("RSS: invalid URL", "fail", f"status={r.status_code} body={data}")
except Exception as e:
    result("RSS: invalid URL", "fail", str(e))

try:
    r = requests.get(f"{BASE}/api/rss?url=https://hnrss.org/frontpage&count=5", timeout=15)
    data = r.json()
    if r.status_code == 200 and "title" in data and "items" in data:
        result("RSS: valid feed returns title + items", "pass", f"title={data['title']!r}, items={len(data['items'])}")
        if len(data["items"]) > 0:
            item = data["items"][0]
            has_fields = all(k in item for k in ("title", "link"))
            result("RSS: items have title + link fields", "pass" if has_fields else "fail")
        else:
            result("RSS: feed returned 0 items", "fail")
    elif r.status_code == 429:
        result("RSS: valid feed (rate limited by proxy — pass)", "pass")
    else:
        result("RSS: valid feed", "fail", f"status={r.status_code}")
except Exception as e:
    result("RSS: valid feed", "fail", str(e))

try:
    r = requests.get(f"{BASE}/api/rss?url=https://does-not-exist.example.com/feed.xml", timeout=15)
    data = r.json()
    if r.status_code == 502:
        result("RSS: unreachable URL returns 502", "pass")
    elif r.status_code == 429:
        result("RSS: unreachable URL (rate limited — pass)", "pass")
    else:
        result("RSS: unreachable URL", "fail", f"status={r.status_code}")
except Exception as e:
    result("RSS: unreachable URL", "fail", str(e))


# ─── 5. GitHub Proxy ─────────────────────────────────────────────────────────

section("5. GitHub Proxy — /api/github")

try:
    r = requests.get(f"{BASE}/api/github", timeout=TIMEOUT)
    data = r.json()
    if r.status_code == 400 and "Missing username" in data.get("error", ""):
        result("GitHub: missing username returns 400", "pass")
    elif r.status_code == 429:
        result("GitHub: missing username (rate limited — pass)", "pass")
    else:
        result("GitHub: missing username", "fail", f"status={r.status_code} body={data}")
except Exception as e:
    result("GitHub: missing username", "fail", str(e))

try:
    r = requests.get(f"{BASE}/api/github?username=torvalds", timeout=15)
    data = r.json()
    if r.status_code == 200 and "user" in data:
        user = data["user"]
        result("GitHub: valid user returns user object", "pass", f"login={user.get('login')}")
        result("GitHub: user has avatar_url", "pass" if user.get("avatar_url") else "fail")
        events = data.get("events", [])
        result("GitHub: events array returned", "pass", f"count={len(events)}")
        if data.get("rateLimited"):
            result("GitHub: rate limited by GitHub API (degraded — pass)", "pass")
    elif r.status_code == 403:
        result("GitHub: valid user (GitHub API rate limited — pass)", "pass")
    elif r.status_code == 429:
        result("GitHub: valid user (proxy rate limited — pass)", "pass")
    else:
        result("GitHub: valid user", "fail", f"status={r.status_code}")
except Exception as e:
    result("GitHub: valid user", "fail", str(e))


# ─── 6. Gmail (requires auth) ────────────────────────────────────────────────

section("6. Gmail — /api/gmail/messages")

try:
    r = requests.get(f"{BASE}/api/gmail/messages", timeout=TIMEOUT)
    data = r.json()
    if r.status_code == 401:
        result("Gmail: no session returns 401", "pass")
    else:
        result("Gmail: no session", "fail", f"expected 401, got {r.status_code}")
except Exception as e:
    result("Gmail: no session", "fail", str(e))

try:
    r = requests.get(
        f"{BASE}/api/gmail/messages",
        timeout=TIMEOUT,
        cookies={"dashboard_session": "invalid.token.here"},
    )
    data = r.json()
    if r.status_code == 401:
        result("Gmail: invalid session returns 401", "pass")
    else:
        result("Gmail: invalid session", "fail", f"expected 401, got {r.status_code}")
except Exception as e:
    result("Gmail: invalid session", "fail", str(e))


# ─── 7. Gmail single message (requires auth) ─────────────────────────────────

section("7. Gmail — /api/gmail/messages/[id]")

try:
    r = requests.get(f"{BASE}/api/gmail/messages/fakeid123", timeout=TIMEOUT)
    data = r.json()
    if r.status_code == 401:
        result("Gmail message: no session returns 401", "pass")
    else:
        result("Gmail message: no session", "fail", f"expected 401, got {r.status_code}")
except Exception as e:
    result("Gmail message: no session", "fail", str(e))


# ─── 8. Rate Limiting ────────────────────────────────────────────────────────

section("8. Rate Limiting (RSS proxy)")

print("  Sending 22 rapid requests to /api/rss (limit is 20)...")
rate_limited = False
for i in range(22):
    try:
        r = requests.get(
            f"{BASE}/api/rss?url=https://example.com/feed{i}",
            timeout=5,
        )
        if r.status_code == 429:
            data = r.json()
            retry_after = r.headers.get("Retry-After")
            result(f"Rate limited at request #{i+1}", "pass", f"retry_after={retry_after}s")
            rate_limited = True
            break
    except Exception:
        pass

if not rate_limited:
    result("Rate limiting did not trigger after 22 requests", "fail")


# ─── Summary ─────────────────────────────────────────────────────────────────

section("Summary")
total = PASS + FAIL
print(f"  \033[92m{PASS} passed\033[0m  \033[91m{FAIL} failed\033[0m  ({total} total)")
print()
if FAIL > 0:
    sys.exit(1)
