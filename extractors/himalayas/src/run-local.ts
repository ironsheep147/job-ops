import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import {
  commonOptions,
  fetchFeed,
  genericJob,
  matchesTerms,
} from "../../feed-utils/src/index";

const URL = "https://himalayas.app/jobs/api?limit=50";

export async function runHimalayas(context: ExtractorRuntimeContext) {
  const options = commonOptions(context);
  if (options.cancelled()) return { success: true, jobs: [] };
  options.progress("himalayas: fetching listings");
  try {
    const payload = await fetchFeed(URL, "json");
    const rows = Array.isArray(payload)
      ? payload
      : (payload?.jobs ?? payload?.results ?? payload?.data ?? []);
    const jobs = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (options.cancelled()) break;
      const restrictions = Array.isArray(row?.locationRestrictions)
        ? row.locationRestrictions.filter(
            (value: unknown): value is string => typeof value === "string",
          )
        : [];
      const job = genericJob("himalayas", {
        ...row,
        url: row?.applicationLink ?? row?.guid,
        company_name: row?.companyName,
        location: restrictions.join(", ") || "Remote",
        description: row?.description ?? row?.excerpt,
        publication_date:
          typeof row?.pubDate === "number"
            ? new Date(row.pubDate * 1000).toISOString()
            : row?.pubDate,
        remote:
          restrictions.length === 0 ||
          restrictions.some((value: string) =>
            /remote|worldwide|anywhere/i.test(value),
          ),
      });
      if (!job || seen.has(job.jobUrl) || !matchesTerms(job, options.terms))
        continue;
      seen.add(job.jobUrl);
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
