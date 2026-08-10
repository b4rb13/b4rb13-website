import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

// withBotId adds the proxy rewrites that keep the bot-protection challenge
// reachable when ad-blockers would otherwise neuter it. Without this wrap the
// challenge never loads and every visitor is classified as a bot.
export default withBotId(nextConfig);
