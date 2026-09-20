import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import {
  commonOptions,
  fetchFeed,
  genericJob,
  matchesTerms,
  rssRows,
} from "../../feed-utils/src/index";

const URL = "https://weworkremotely.com/remote-jobs.rss";

export async function runWeworkremotely(context: ExtractorRuntimeContext) {
  const options = commonOptions(context);
  if (options.cancelled()) return { success: true, jobs: [] };
  options.progress("weworkremotely: fetching listings");
  try {
    const payload = await fetchFeed(URL, "text");
    const rows = rssRows(payload);
    const jobs = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (options.cancelled()) break;
      const job = genericJob("weworkremotely", row);
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
