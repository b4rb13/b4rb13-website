import { initBotId } from "botid/client/core";
import { CONTACT_API_METHOD, CONTACT_API_PATH } from "@/lib/contact/contract";

/**
 * Runs after the document loads and before React hydration, so the fetch
 * patching is in place before anyone can press enter.
 *
 * `initBotId` monkey-patches `window.fetch`. Two consequences for callers:
 *
 *  - the send must call `fetch` as a **bare global at call time**. An aliased
 *    or module-scope-captured reference bypasses the patch, ships no
 *    `x-is-human` header, and gets the visitor classified as a bot.
 *  - the path and method below must match the route exactly. They come from
 *    one shared constant for that reason — a mismatch blocks 100% of real
 *    users, and in production the library only warns.
 *
 * `checkLevel` is deliberately not set: omitting it on both sides means the
 * project-level setting applies and there is no client/server mismatch to get
 * wrong. Basic is free on every plan and is what this endpoint needs.
 */
initBotId({
  protect: [
    {
      path: CONTACT_API_PATH,
      method: CONTACT_API_METHOD,
    },
  ],
});
