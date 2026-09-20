import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import {
  commonOptions,
  fetchFeed,
  genericJob,
  matchesTerms,
  rssRows,
} from "../../feed-utils/src/index";

const URL = "https://jobicy.com/api/v2/remote-jobs?count=50";

export async function runJobicy(context: ExtractorRuntimeContext) {
  const options = commonOptions(context);
  if (options.cancelled()) return { success: true, jobs: [] };
  options.progress("jobicy: fetching listings");
  try {
    const payload = await fetchFeed(URL, "json");
    const rows = Array.isArray(payload)
      ? payload
      : (payload?.jobs ?? payload?.results ?? payload?.data ?? []);
    const jobs = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (options.cancelled()) break;
      const job = genericJob("jobicy", row);
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
