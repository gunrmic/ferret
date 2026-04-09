import type { AlertJobPayload } from '@ferret/types';

export function formatAlertContent(payload: AlertJobPayload, siteUrl: string): string {
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
    `${packageName} v${version} — suspicious code detected (score: ${riskScore}/100)`,
    '',
    `Flagged: ${topFlags}`,
    '',
    `Published ${timeAgo} · ${downloads} weekly downloads`,
    '',
    `${siteUrl}/scan/${encodedPkg}/${version}`,
  ].join('\n');
}
