import { TwitterApi } from 'twitter-api-v2';
import type { AlertJobPayload } from '@ferret/types';
import type { AlerterConfig } from './config.js';

export function createTwitterClient(config: AlerterConfig): TwitterApi {
  return new TwitterApi({
    appKey: config.TWITTER_API_KEY,
    appSecret: config.TWITTER_API_SECRET,
    accessToken: config.TWITTER_ACCESS_TOKEN,
    accessSecret: config.TWITTER_ACCESS_SECRET,
  });
}

export function formatTweet(payload: AlertJobPayload, siteUrl: string): string {
  const { packageName, version, riskScore, staticFlags, weeklyDownloads, detectedAt } = payload;

  const uniqueRules = [...new Set(staticFlags.map((f) => f.rule))];
  const topFlags = uniqueRules.slice(0, 3).join(', ');

  const minutesAgo = Math.round(
    (Date.now() - new Date(detectedAt).getTime()) / 60_000,
  );
  const timeAgo = minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.round(minutesAgo / 60)}h ago`;

  const downloads =
    weeklyDownloads >= 1_000_000
      ? `${(weeklyDownloads / 1_000_000).toFixed(1)}M`
      : `${Math.round(weeklyDownloads / 1_000)}K`;

  const encodedPkg = encodeURIComponent(packageName);

  return [
    `\u{1F6A8} ${packageName} v${version} \u2014 suspicious code detected (score: ${riskScore}/100)`,
    '',
    `Flagged: ${topFlags}`,
    '',
    `Published ${timeAgo} \u00B7 ${downloads} weekly downloads`,
    '',
    `${siteUrl}/scan/${encodedPkg}/${version}`,
  ].join('\n');
}

export async function postTweet(
  client: TwitterApi,
  text: string,
): Promise<string> {
  const result = await client.v2.tweet(text);
  return result.data.id;
}
