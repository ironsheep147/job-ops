import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import {
  commonOptions,
  fetchFeed,
  locationEvidence,
  matchesTerms,
  plain,
} from "../../feed-utils/src/index";

const GENERALIST_JOBS_URL = "https://generalist.world/jobs/";

function decodeEntities(value: string): string {
  return value
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&pound;/gi, "£")
    .replace(/&#8211;/gi, "–")
    .replace(/&#9733;/gi, "★");
}

function field(card: string, className: string): string {
  const match = card.match(
    new RegExp(
      `<[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/`,
      "i",
    ),
  );
  return decodeEntities(plain(match?.[1] ?? ""));
}

export async function runGeneralistworld(context: ExtractorRuntimeContext) {
  const options = commonOptions(context);
  if (options.cancelled()) return { success: true, jobs: [] };
  options.progress("generalistworld: fetching listings");

  try {
    const html = await fetchFeed(GENERALIST_JOBS_URL, "text");
    const jobs = [];
    const seen = new Set<string>();
    const cards =
      html.match(
        /<a[^>]+class=["'][^"']*\bgw-job-card\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
      ) ?? [];

    for (const card of cards) {
      if (options.cancelled()) break;
      const href = card.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? "";
      const jobUrl = href
        ? new globalThis.URL(href, GENERALIST_JOBS_URL).href
        : "";
      const title = field(card, "gw-job-title");
      if (!jobUrl || !title || seen.has(jobUrl)) continue;
      const location = field(card, "gw-location") || "Remote";
      const employer =
        field(card, "gw-job-company") || "Generalist World employer";
      const description = field(card, "gw-job-description");
      const job = {
        source: "generalistworld" as const,
        sourceJobId: jobUrl,
        title,
        employer,
        jobUrl,
        applicationLink: jobUrl,
        location,
        jobDescription: description || undefined,
        locationEvidence: locationEvidence(
          location,
          "generalistworld",
          /remote/i.test(location),
        ),
        isRemote: /remote/i.test(location),
      };
      if (!matchesTerms(job, options.terms)) continue;
      seen.add(jobUrl);
      jobs.push(job);
      if (jobs.length >= options.limit) break;
    }

    return { success: true, jobs };
  } catch (error) {
    return {
      success: false,
      jobs: [],
      error: error instanceof Error ? error.message : "upstream failure",
    };
  }
}
