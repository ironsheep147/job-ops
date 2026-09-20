import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import {
  commonOptions,
  fetchFeed,
  genericJob,
  locationEvidence,
  matchesTerms,
  plain,
} from "../../feed-utils/src/index";

const URL = "https://agentic-engineering-jobs.com/api/v1/jobs";
const HTML_URL = "https://agentic-engineering-jobs.com/jobs";

function parseHtmlListings(html: string, limit: number) {
  const jobs = [];
  const seen = new Set<string>();
  const cards =
    html.match(/<a[^>]+href=["'](\/jobs\/[^"']+)["'][^>]*>[\s\S]*?<\/a>/gi) ??
    [];

  for (const card of cards) {
    const href = card.match(/\bhref=["'](\/jobs\/[^"']+)["']/i)?.[1] ?? "";
    const jobUrl = href ? new globalThis.URL(href, HTML_URL).href : "";
    const title = plain(
      card.match(/<span[^>]*font-semibold[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "",
    );
    const employer = plain(
      card.match(/<p[^>]*text-muted[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "",
    );
    const location = /\bRemote\b/i.test(card)
      ? "Remote"
      : (card.match(/<span[^>]*title=["']([^"']+)["'][^>]*>/i)?.[1] ?? "");
    const datePosted = plain(
      card.match(/<div[^>]*lg:text-right[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "",
    );
    if (!jobUrl || !title || seen.has(jobUrl)) continue;
    seen.add(jobUrl);
    jobs.push({
      source: "agenticjobs" as const,
      sourceJobId: jobUrl,
      title,
      employer: employer || "Agentic Engineering Jobs employer",
      jobUrl,
      applicationLink: jobUrl,
      location: location || "Worldwide",
      datePosted: datePosted || undefined,
      locationEvidence: locationEvidence(
        location || "Worldwide",
        "agenticjobs",
        /remote|worldwide/i.test(location),
      ),
      isRemote: /remote|worldwide/i.test(location),
    });
    if (jobs.length >= limit) break;
  }

  return jobs;
}

export async function runAgenticjobs(context: ExtractorRuntimeContext) {
  const options = commonOptions(context);
  if (options.cancelled()) return { success: true, jobs: [] };
  options.progress("agenticjobs: fetching listings");
  try {
    const payload = await fetchFeed(URL, "json");
    const rows = Array.isArray(payload)
      ? payload
      : (payload?.jobs ?? payload?.results ?? payload?.data ?? []);
    const jobs = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (options.cancelled()) break;
      const job = genericJob("agenticjobs", row);
      if (!job || seen.has(job.jobUrl) || !matchesTerms(job, options.terms))
        continue;
      seen.add(job.jobUrl);
      jobs.push(job);
      if (jobs.length >= options.limit) break;
    }
    return { success: true, jobs };
  } catch (error) {
    try {
      const html = await fetchFeed(HTML_URL, "text");
      const jobs = parseHtmlListings(html, options.limit).filter((job) =>
        matchesTerms(job, options.terms),
      );
      if (jobs.length > 0) return { success: true, jobs };
    } catch {
      // Preserve the original API failure below; the HTML page is only a fallback.
    }
    return {
      success: false,
      jobs: [],
      error: error instanceof Error ? error.message : "upstream failure",
    };
  }
}
