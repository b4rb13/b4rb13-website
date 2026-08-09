# Vercel BotID on a Next.js App Router route handler

Research for [#5](https://github.com/b4rb13/b4rb13-website/issues/5) (part of [#3](https://github.com/b4rb13/b4rb13-website/issues/3)).

**Project context:** Next.js 15.5.7, App Router, React 19, Bun, Biome, deployed on Vercel.
The protected call is a `fetch()` fired from inside a terminal command handler in a client
component — not a form submit, not a navigation.

**Sources.** Everything below is either from `vercel.com/docs` (linked inline) or read directly
out of the published `botid` npm package (`botid@1.5.11`, files `dist/client/core/index.mjs`,
`dist/server/index.mjs`, `dist/server/index.d.ts`, `dist/next/config/index.mjs`). Where a claim
comes from reading the package source rather than the docs, it is marked **[source]** — those are
implementation details that are true of 1.5.11 but are not contractual and could change.

**Headline answer:** BotID is a *better* fit for this design than for a normal form. Vercel
explicitly does **not** support native HTML form submissions; the supported path is exactly
"handle it in JavaScript and send with `fetch`". A `fetch` from a command handler is the happy
path. Basic mode is free on all plans including Hobby.

---

## 1. Server-side check in an App Router `route.ts`

Straight from [Get Started](https://vercel.com/docs/botid/get-started):

```ts
// src/app/api/contact/route.ts
import { checkBotId } from 'botid/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const verification = await checkBotId();

  if (verification.isBot) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body = await request.json();
  // ... send via Resend
  return NextResponse.json({ success: true });
}
```

`checkBotId()` takes **no request argument**. It reads the incoming headers out of Vercel's
ambient request context (`Symbol.for('@vercel/request-context')`), falling back to `next/headers`
in development. **[source]** This is why it "just works" inside an App Router handler with no
plumbing, and why the Pages Router needs `advancedOptions.headers` passed explicitly
([advanced configuration](https://vercel.com/docs/botid/advanced-configuration)).

### Full return type

From `botid@1.5.11` `dist/server/index.d.ts` **[source]** — the docs never publish this in full:

```ts
Promise<{
  isHuman: boolean;
  isBot: boolean;
  isVerifiedBot: boolean;
  verifiedBotName: string | undefined;
  verifiedBotCategory: string | undefined;
  bypassed: boolean;
  /** @deprecated Reach out to Vercel support to get access to the classificationReason */
  classificationReason: string | undefined;
  responseHeaders?: { /* only when advancedOptions.returnResponseHeaders */ };
}>
```

`isVerifiedBot` / `verifiedBotName` / `verifiedBotCategory` are documented on
[Handling Verified Bots](https://vercel.com/docs/botid/verified-bots) (requires `botid@1.5.0+`).
Not relevant for a contact form — we want to reject every bot, verified or not — but worth knowing
that `isBot` is true for good bots too, so a blanket `if (isBot) reject` will also turn away
Googlebot/ChatGPT Operator. That is the correct behaviour for a send endpoint.

`bypassed: true` means a [WAF bypass rule](https://vercel.com/docs/vercel-firewall/firewall-concepts#bypass)
let the request through, **or** that we are in local development without `developmentOptions`
**[source]**. Do not treat `bypassed` as a security signal.

### Two undocumented prerequisites, read from the source **[source]**

Both of these will bite at deploy time and neither is on the BotID docs pages:

1. **OIDC must be enabled on the project.** `checkBotId()` reads
   `x-vercel-oidc-token` from the request headers (or `process.env.VERCEL_OIDC_TOKEN`) and
   *throws* if absent:

   > `The 'x-vercel-oidc-token' header is missing from the request. Do you have the OIDC option enabled in the Vercel project settings?`

   That is Project → Settings → Security → *Secure backend access with OIDC federation*
   ([OIDC docs](https://vercel.com/docs/oidc)). I could **not confirm from docs** whether this is
   on by default for a new Hobby project — verify in the dashboard before the first deploy.
   Because it throws rather than returning `isBot`, an unhandled failure here is a 500, not a 403.
   Wrap the call in `try/catch` and decide deliberately whether to fail open or closed.

2. **It must actually be running on Vercel.** After the network call to
   `https://api.vercel.com/bot-protection/v1/is-bot`, the code requires
   `requestContext.mutateResponseHeadersBeforeFlush` and throws
   `Must be deployed on Vercel to set response headers` if it is missing. So a local
   `next build && next start` with `NODE_ENV=production` will **throw**, not verify. See §4.

---

## 2. Client-side initialisation — and does a bare `fetch` count?

### Yes. `fetch` is the *only* supported transport.

[Form Submissions](https://vercel.com/docs/botid/form-submissions):

> BotID does **not** support traditional HTML forms that use the `action` and `method` attributes
> […] Native form submissions don't work with BotID due to how they are handled by the browser.
> To ensure the necessary headers are attached, handle the form submission in JavaScript and send
> the request using `fetch` or `XMLHttpRequest`, allowing BotID to properly verify the request.

And from [Get Started](https://vercel.com/docs/botid/get-started):

> To effectively test, make a `fetch` request from a page in your application to the protected route.

So the terminal's "fire a `fetch` when the user presses enter" shape is the *supported* one. The
form-submit case is the broken one.

### Mechanism **[source]**

`initBotId()` monkey-patches `window.fetch` and `XMLHttpRequest.prototype.open/send`, synchronously,
at call time. The patched `fetch` intercepts a request only when **all** of:

- the resolved URL is **same-origin** (`url.origin === location.origin`) — a relative `/api/contact`
  is fine; an absolute URL to another host is silently *not* protected;
- `url.pathname` matches one of the `protect[].path` globs (`*` expands across segments);
- the method matches `protect[].method` case-insensitively, or the entry uses `'*'`.

On a match it awaits the challenge, then sets three request headers: `x-is-human`, `x-path`,
`x-method`. The challenge script (`/149e.../c.js`) is injected lazily on the **first** protected
request and the fetch awaits it, so there is no "fired too early" race — but the first protected
send pays the script-load latency. If the route is configured `checkLevel: 'deepAnalysis'` (or the
challenge asks for it), the heavier Kasada SDK (`p.js`) is loaded and the fetch is re-issued, adding
more first-call latency.

**Design consequence for the terminal:** the very first `connect --message` send in a session will
be noticeably slower than subsequent ones. Show a pending state ("sending…") rather than assuming
it returns fast. Optionally warm it by calling `initBotId` early (it already runs pre-hydration) —
but note the challenge fetch itself is lazy, so it genuinely happens on first send.

**Second design consequence:** because it patches `window.fetch`, any code holding a reference to
`fetch` captured *before* `initBotId()` ran, or using a non-global fetch (a wrapper that closed over
`globalThis.fetch` at module init, `node-fetch`, an HTTP client with its own transport) will bypass
protection and the server will see no `x-is-human` header → `isBot`. Call `fetch(...)` as a bare
global at call time in the command handler. Don't alias it.

### Where the init goes

Three pieces, per [Get Started](https://vercel.com/docs/botid/get-started):

**a. Install**

```bash
bun i botid
```

**b. Wrap `next.config.ts`** — sets up the proxy rewrites so ad-blockers can't neuter the challenge:

```ts
// next.config.ts
import { withBotId } from 'botid/next/config';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // existing config
};

export default withBotId(nextConfig);
```

`withBotId` merges two rewrites (into `beforeFiles` if the app already uses the object form) and one
`headers` entry for the obfuscated `/149e9513-.../2d206a39-.../` prefix, pointing at
`https://api.vercel.com/bot-protection/v1/{challenge,proxy}` **[source]**. This repo's `next.config.ts`
is currently an empty object, so the wrap is a one-liner with no merge risk.

**c. Client init.** Next.js 15.3+ (we are on 15.5.7) uses `instrumentation-client.ts`. This repo has
a `src/` directory, so the file goes at **`src/instrumentation-client.ts`** — Next.js accepts it "in
the **root** of your application or inside a `src` folder"
([Next.js docs](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client)).

```ts
// src/instrumentation-client.ts
import { initBotId } from 'botid/client/core';

initBotId({
  protect: [
    {
      path: '/api/contact',
      method: 'POST',
    },
  ],
});
```

`instrumentation-client.ts` runs **after the HTML document loads and before React hydration begins**
(Next.js docs, "Execution timing"), and `initBotId` does its `fetch`/XHR patching synchronously
**[source]** — so it is guaranteed to be in place before any user can press enter. No provider
component, no hook, nothing inside the terminal component tree.

The pre-15.3 alternative — `<BotIdClient protect={...} />` in the `<head>` of `app/layout.tsx` — is
also available and would work, but `instrumentation-client.ts` is what the docs call
"Recommended" for our version.

**The path list is load-bearing.** From the docs:

> Not adding the protected route to `<BotIdClient />` will result in `checkBotId()` failing. The
> client side component dictates which requests to attach special headers to for classification
> purposes.

So `protect[].path` must exactly match the route the terminal fetches, and `method` must match too.
Get this wrong and every real visitor is classified as a bot. The library does log a loud,
copy-pasteable console error naming the exact `{ path, method }` it expected, but only in non-prod
builds — in production it degrades to a terse `console.warn` **[source]**.

---

## 3. Basic vs Deep Analysis

From [BotID](https://vercel.com/docs/botid):

| | Basic | Deep Analysis |
|---|---|---|
| What it does | "validates the integrity and correctness of the challenge response, catching many less sophisticated bots" | Kasada ML over "thousands of client side signals", detection method rotated per page load, global attack-data feedback loop. Runs **only after Basic has passed** |
| Plans | **All plans** (incl. Hobby) | **Pro** and **Enterprise** only |
| Price | Free | $1 / 1000 `checkBotId()` Deep Analysis calls (Pro); custom (Enterprise) |

Configured either project-wide (dashboard → project → Firewall → Rules → *Vercel BotID Deep
Analysis*) or per-route via `advancedOptions.checkLevel`, which **takes precedence over the
project-level setting** ([advanced configuration](https://vercel.com/docs/botid/advanced-configuration),
requires `botid@1.4.5+`):

```ts
// client
initBotId({ protect: [{ path: '/api/contact', method: 'POST',
  advancedOptions: { checkLevel: 'basic' } }] });

// server — MUST be identical
const verification = await checkBotId({ advancedOptions: { checkLevel: 'basic' } });
```

> **Important**: The `checkLevel` in both client and server configurations must be identical for
> each protected route. A mismatch […] will cause BotID verification to fail, potentially blocking
> legitimate traffic or allowing bots through.

**Recommendation for this site: Basic.** It is free, it is available on Hobby, and Deep Analysis is
not purchasable on Hobby at all. The threat model here is drive-by form spam hitting a contact
endpoint, not credential stuffing — Basic plus the fact that the endpoint is an undocumented route
behind a terminal UI is proportionate. Deep Analysis also adds real first-request latency (loading
the Kasada SDK and re-issuing the fetch **[source]**), which is worse UX in a terminal than the
protection is worth.

Practical advice: **do not** pass `advancedOptions.checkLevel` at all initially. Omitting it means
the project-level dashboard setting applies, and there is no client/server mismatch to get wrong.
Only set it explicitly (on both sides) if the project toggle later needs to differ per route.

---

## 4. Local dev, preview deployments, and how to test

### Local dev (`next dev`)

> In development mode, `checkBotId()` always returns `{ isBot: false }`, allowing all requests to
> pass through. — [Local Development Behavior](https://vercel.com/docs/botid/local-development-behavior)

"Development" is decided by `developmentOptions.isDevelopment ?? process.env.NODE_ENV !== 'production'`
**[source]**. In dev with no options it returns `{ isHuman: true, isBot: false, isVerifiedBot: false,
bypassed: true }` and logs `[Dev Only] Without setting the developmentOptions.bypass value, the bot
protection will return HUMAN.`

To exercise the rejection branch locally, force a verdict:

```ts
const verification = await checkBotId({
  developmentOptions: {
    bypass: 'BAD-BOT', // default: 'HUMAN'
  },
});
```

The full override union is `'HUMAN' | 'BAD-BOT' | 'GOOD-BOT' | 'ALLOWED' | undefined` **[source]**
(the docs only show `HUMAN` and `BAD-BOT`). Mapping **[source]**:
`HUMAN` → `isHuman: true`; `BAD-BOT` → `isBot: true`; `GOOD-BOT` → `isVerifiedBot: true`;
`ALLOWED` → all three false. In all bypass cases `bypassed` is reported as `false`.

> The `developmentOptions` option only works in development mode and is ignored in production.

Gate it so it can never ship live, e.g.:

```ts
const verification = await checkBotId(
  process.env.BOTID_DEV_VERDICT
    ? { developmentOptions: { bypass: process.env.BOTID_DEV_VERDICT as 'BAD-BOT' } }
    : undefined,
);
```

### Preview deployments

**Not documented.** Inferring from the source **[source]**: Vercel builds preview deployments with
`NODE_ENV=production`, so `isDevelopment` is false and **preview deployments run the real check**,
identical to production. The library's own misconfiguration logging distinguishes
`VERCEL_ENV !== 'production'` (verbose error) from production (terse warn), which confirms it expects
to be live in preview. Nothing in the source special-cases preview for the verdict itself.

Caveat worth flagging: if the preview deployment is behind **Vercel Deployment Protection** you'll be
authenticating through a Vercel SSO cookie, which does not interfere with BotID, but does mean the
preview URL isn't reachable by a naive curl anyway.

I have **not** empirically confirmed preview behaviour. Treat "preview behaves like production" as a
strong inference to be verified with one preview deploy, not as documented fact.

### Testing without a production deploy

The practical ladder, best to worst:

1. **Preview deployment, real browser.** Push the branch, open the preview URL, run the command in
   the terminal UI. This is the only way to see the genuine happy path end to end. Check
   Project → Firewall → traffic dropdown → **BotID** to see the check land
   ([firewall observability](https://vercel.com/docs/vercel-firewall/firewall-observability#traffic)).
2. **Preview deployment, curl.** `curl -X POST <preview>/api/contact` should be rejected, because
   the request carries no `x-is-human` header. This is the documented way to prove rejection:
   > If you test with `curl` or visit a protected route directly, BotID will block you in production.
3. **Local `next dev` with `developmentOptions.bypass: 'BAD-BOT'`.** Proves the terminal renders the
   rejection copy correctly. Fast loop, but exercises none of the real detection.

**What does not work:** running `next build && next start` locally to get "production" behaviour. With
`NODE_ENV=production` the dev bypass is skipped and `checkBotId()` will throw — first on the missing
OIDC token, and even with `VERCEL_OIDC_TOKEN` pulled via `vercel env pull` it then throws
`Must be deployed on Vercel to set response headers` because the Vercel request context is absent
**[source]**. Don't burn time on this path.

---

## 5. What a rejection looks like on the wire

**Crucially: BotID does not block anything itself.** There is no edge rejection, no Vercel-generated
error page, no reserved status code. The bot request reaches your route handler normally; `checkBotId()`
returns `isBot: true`; **your code** decides the status and body. Every "403 / `{ error: 'Access denied' }`"
in the docs is just the example handler's own choice
([get-started](https://vercel.com/docs/botid/get-started),
[verified bots](https://vercel.com/docs/botid/verified-bots),
[KB guide](https://vercel.com/kb/guide/protect-ai-endpoints-with-vercel-botid)).

So the terminal can render whatever it likes, as long as the route and the client agree. Suggested
contract, distinguishable from a Resend failure or a validation error:

```ts
if (verification.isBot) {
  return NextResponse.json(
    { error: 'bot_detected', message: 'Automated traffic detected. Message not sent.' },
    { status: 403 },
  );
}
```

Client side, branch on the discriminator rather than on the status code alone, since 403 could come
from elsewhere:

```ts
const res = await fetch('/api/contact', { method: 'POST', /* ... */ });

if (res.status === 403) {
  const body = await res.json().catch(() => null);
  if (body?.error === 'bot_detected') {
    // honest terminal line, e.g.
    // "transmission blocked: automated traffic detected."
    // "if you're human, reload the page and try again."
  }
}
```

Two failure modes the terminal must not conflate:

- **`isBot: true`** — a real verdict. Tell the user plainly. A genuine human hitting this most likely
  has JavaScript interfered with (aggressive extension, exotic browser); "reload and retry" is honest
  advice, and if it persists it is a real dead end for that visitor.
- **`checkBotId()` threw** — a misconfiguration (OIDC off, wrong path in `protect`, not on Vercel).
  This is a 500-shaped problem, not a bot. Catch it separately and return a distinct code so the
  terminal says "send failed" rather than accusing the user of being a robot. Decide fail-open vs
  fail-closed: for a low-stakes contact form, **failing open** (deliver the mail, log loudly) is the
  kinder default, but that is a product call.

---

## 6. Cost and metering

From [BotID → Pricing](https://vercel.com/docs/botid):

| Mode | Plans | Price |
|---|---|---|
| Basic | All Plans | **Free** |
| Deep Analysis | Pro | $1 / 1000 `checkBotId()` Deep Analysis calls |
| Deep Analysis | Enterprise | Custom |

> Calling the `checkBotId()` function in your code triggers BotID Deep Analysis charges. Passive page
> views or requests that don't invoke the `checkBotId()` function are not charged.

Reading this precisely: **metering is per `checkBotId()` invocation, and only for Deep Analysis.**
Basic-mode `checkBotId()` calls are free and unmetered. On the Hobby plan there is nothing to pay
and nothing to meter, because Deep Analysis is not available there at all.

Secondary costs to be aware of:

- Bot requests that `checkBotId()` rejects **still ran a Vercel Function**. Unlike WAF-mitigated
  traffic — which explicitly does *not* incur CDN Requests or Fast Data Transfer
  ([WAF usage & pricing](https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing)) —
  a BotID rejection is application code, so it consumes function invocation/duration. Negligible at
  this site's volume, but it means BotID is not a shield against a volumetric flood. If that ever
  matters, put a WAF rate-limit rule in front of the route as well.
- The BotID challenge and proxy traffic route through the rewrites `withBotId` adds. I could **not
  confirm** from the docs whether those proxied requests count toward CDN Requests / FDT. Assume
  they might; at low volume it is immaterial.

**Verdict: BotID Basic is free on Hobby and appropriate here. No plan upgrade required, no dealbreaker.**

---

## Checklist for the implementation ticket

- [ ] `bun i botid`
- [ ] Wrap `next.config.ts` in `withBotId(...)`
- [ ] Create `src/instrumentation-client.ts` with `initBotId({ protect: [{ path: '<final route>', method: 'POST' }] })`
- [ ] Keep the `protect` path in sync with the actual route — a single source of truth constant shared
      by the client init and the route file is worth the ceremony
- [ ] `checkBotId()` at the very top of the `POST` handler, before parsing the body or touching Resend
- [ ] `try/catch` around `checkBotId()`; distinct error code for "check failed" vs "is bot"
- [ ] Confirm OIDC federation is enabled in Project → Settings → Security
- [ ] Leave `checkLevel` unset; leave the dashboard Deep Analysis toggle off (unavailable on Hobby)
- [ ] Call `fetch` as a bare global inside the command handler — never an aliased/captured reference
- [ ] Terminal shows a pending state; first send in a session is slower (lazy challenge load)
- [ ] Verify on a preview deployment: real browser = success, `curl` = 403

## Open questions / not confirmed

1. **Preview deployment behaviour** is inferred from `NODE_ENV`, not documented. Verify with one
   preview deploy.
2. **Whether OIDC federation is on by default** for a fresh Hobby project. Check the dashboard before
   deploying; `checkBotId()` throws rather than degrading if it is off.
3. **Whether BotID challenge/proxy traffic is billed** as CDN Requests / FDT. Not addressed in the
   pricing docs.
4. **`classificationReason`** is returned but marked deprecated and gated behind Vercel support, so
   there is no self-serve way to know *why* a request was classified as a bot. Debugging a
   false positive will be opaque.

## Source index

- https://vercel.com/docs/botid
- https://vercel.com/docs/botid/get-started
- https://vercel.com/docs/botid/advanced-configuration
- https://vercel.com/docs/botid/local-development-behavior
- https://vercel.com/docs/botid/form-submissions
- https://vercel.com/docs/botid/verified-bots
- https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing
- https://vercel.com/docs/vercel-firewall/firewall-observability
- https://vercel.com/docs/oidc
- https://vercel.com/kb/guide/protect-ai-endpoints-with-vercel-botid
- https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
- `botid@1.5.11` on npm — `dist/client/core/index.mjs`, `dist/server/index.mjs`,
  `dist/server/index.d.ts`, `dist/next/config/index.mjs`
