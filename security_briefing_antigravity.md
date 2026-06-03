# 🔐 Security Briefing — AQA Sports Admin Panel
**To:** antigravity  
**From:** AQA Sports  
**Re:** Critical vulnerabilities on `aqasports.com/digger`  
**Priority:** 🔴 Urgent — fix before any real data is stored

---

## Overview

Hey, I had the admin panel at `/digger` audited and the results are bad.
Right now, **anyone on the internet can open it with zero authentication** — no login, no token, nothing.
I loaded the full control panel in one browser request. The "secret URL" is the entire security model, and it's not enough.

Below is a breakdown of every issue found, ranked by severity, with exactly what needs to be done to fix each one.

---

## 🚨 Critical Issues (fix these today)

### 1. No authentication whatsoever

**What's wrong:**  
The page renders in full for anyone who navigates to the URL. There is no login form, session check, or token validation anywhere. The admin panel — including planning tools, infrastructure management, formation data, and the GitHub deploy console — is completely public.

**What to do:**
- Add a **server-side authentication middleware** that runs before any admin route is served
- Use a proper **session-based or JWT-based auth flow**
- The check must happen on the server — client-side JS auth is trivially bypassed
- Recommended stack: `express-session` + `bcrypt` (Node), or `flask-login` (Python), or equivalent for your backend framework

**Minimum viable fix (Node/Express example):**
```js
// middleware/auth.js
function requireAuth(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect('/login');
  }
  next();
}

// Apply to all admin routes
app.use('/digger', requireAuth, adminRouter);
```

---

### 2. The secret URL is being indexed by Google

**What's wrong:**  
The page's own HTML meta tags broadcast the admin path to every search engine:
```html
<meta name="robots" content="index, follow">   <!-- ← this indexes the admin URL -->
<link rel="canonical" href="https://aqasports.com/digger">
<meta property="og:url" content="https://aqasports.com/digger">
```
Google will crawl and index `/digger`. Anyone searching for AQA Sports admin panel may find it directly.

**What to do:**
- Change the robots meta immediately:
```html
<meta name="robots" content="noindex, nofollow">
```
- Remove the `canonical` and `og:url` tags from admin pages entirely — these are for public-facing SEO only
- Add `/digger` (and any future admin path) to `robots.txt`:
```
User-agent: *
Disallow: /digger
```
- Note: `robots.txt` is a polite request, not a technical barrier. Real protection still requires authentication.

---

### 3. Current admin URL exposed in plaintext on the page

**What's wrong:**  
The settings panel displays the current secret URL (`digger`) inside a visible form field. Anyone who opens the page can read it — which is everyone, since there's no auth gate.

Even after adding auth, rendering the secret path value on the client is poor practice.

**What to do:**
- Never send security-sensitive values to the client
- The URL-change form should only accept a *new* URL value as input — it should never pre-fill or display the current one
- Manage the current URL server-side only (environment variable or config file)

---

### 4. Password value sent to the client

**What's wrong:**  
The current password field is shown as `••••••••` visually, but if the password value is being pre-populated in the HTML or JavaScript state, it can be read by opening DevTools → Network or inspecting the page source.

**What to do:**
- The password change form should be a **one-way input only**: old password in, new password in, confirm — no pre-fill
- Never send the current password hash or value to the browser under any circumstances
- Store passwords using `bcrypt` (min 12 rounds):
```js
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(newPassword, 12);
```
- Validate the old password server-side before allowing a change:
```js
const match = await bcrypt.compare(oldPassword, storedHash);
if (!match) return res.status(401).json({ error: 'Incorrect password' });
```

---

## 🔴 High Severity

### 5. GitHub deploy button is publicly accessible

**What's wrong:**  
A "Deploy to GitHub" button and a live deployment console are reachable without any authentication. Anyone can trigger a production deployment or inject content.

**What to do:**
- Protect all deploy actions behind authentication (see issue #1)
- Add a **secondary confirmation step** before any deploy is triggered (confirmation modal + re-enter password)
- Consider moving deploy functionality out of the browser entirely and into a CI/CD pipeline (GitHub Actions, etc.) triggered by git push rather than a browser button
- If you keep the browser deploy button, add **rate limiting** and **IP allowlisting** as extra layers

---

### 6. All academy data and controls are publicly writable

**What's wrong:**  
Planning schedules, formation catalogs, infrastructure records, and homepage performance counters are all editable by any anonymous visitor. A bad actor could corrupt data, change displayed statistics, or delete records.

**What to do:**
- Every POST/PUT/DELETE API endpoint must validate the session before executing
- Read-only views (dashboard, stats) should also require auth — data leakage matters even without modification
- Add **CSRF protection** to all forms:
```js
// Using csurf (Node)
const csrf = require('csurf');
app.use(csrf());
// Include token in every form
res.locals.csrfToken = req.csrfToken();
```

---

## 🔵 Medium Severity

### 7. Security through obscurity is the entire defense

**What's wrong:**  
The current security model is: *"the URL is hard to guess."* This is not a security mechanism. The path can be:
- Found in browser history on a shared device
- Leaked in HTTP `Referer` headers when navigating to external links
- Discovered through search engine indexing (see issue #2)
- Guessed via brute-force path scanning tools (`/admin`, `/panel`, `/dashboard`, `/digger` etc.)

**What to do:**
- Treat obscurity as one optional extra layer — never as the only layer
- After implementing real authentication, the secret URL still adds minor friction for attackers, so you can keep it
- Do not store the URL in client-visible code, meta tags, or JS variables

---

### 8. No rate limiting or brute-force protection

**What's wrong:**  
Once a login page exists, it needs to be protected against password guessing.

**What to do:**
- Implement login attempt rate limiting:
```js
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts
  message: 'Too many login attempts. Try again later.'
});
app.post('/login', loginLimiter, loginHandler);
```
- Lock the account after N failed attempts and require a reset
- Log failed authentication attempts with IP and timestamp

---

## ✅ Recommended Security Stack

Here is a minimal, proven setup for securing this panel end-to-end:

| Layer | Tool / Approach |
|---|---|
| Authentication | `express-session` + `bcrypt` or Passport.js |
| Session storage | Redis (via `connect-redis`) — not in-memory |
| Password hashing | `bcrypt`, min 12 rounds |
| CSRF protection | `csurf` middleware |
| Rate limiting | `express-rate-limit` |
| Crawl protection | `robots: noindex, nofollow` + `robots.txt` disallow |
| Transport security | HTTPS everywhere (check cert is valid and force redirects) |
| Secret management | `.env` file + `dotenv`, never hardcoded in source |

---

## 🗓 Suggested Fix Order

Work through these in order — each one reduces exposure before the next is done:

1. **Today** — Add `robots: noindex, nofollow` and remove canonical/og:url from admin pages. Blocks Google indexing immediately, zero code risk.
2. **Today** — Remove the current URL and password value from any client-rendered output.
3. **This week** — Implement server-side authentication middleware with session management. This single fix closes the majority of the attack surface.
4. **This week** — Add CSRF tokens to all admin forms.
5. **Before go-live** — Add rate limiting to the login route and deploy action.
6. **Before go-live** — Audit all admin API endpoints to confirm every write action checks the session.

---

## Notes

- The HTTPS connection appears to be set up — that's the one positive. Keep it and make sure HTTP requests are permanently redirected to HTTPS (301).
- The obscure URL (`/digger`) can stay as a minor extra layer once real auth is in place.
- If you need a hand with any of the implementation, send me the backend framework you're using (Node, Python, PHP, etc.) and I can give you more specific code.

Let me know when authentication is in place and I'll run the audit again.

---

*Audit performed: June 2026 | Panel: aqasports.com/digger | Auditor: AQA Sports internal review*
