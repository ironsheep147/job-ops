import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import {
  commonOptions,
  fetchFeed,
  locationEvidence,
  matchesTerms,
  plain,
} from "../../feed-utils/src/index";

export async function runThemuse(context: ExtractorRuntimeContext) {
  const options = commonOptions(context);
  const jobs = [];
  const seen = new Set<string>();
  try {
    for (let page = 0; page < 100 && jobs.length < options.limit; page += 1) {
      if (options.cancelled()) break;
      options.progress(`The Muse: page ${page + 1}`);
      const payload = await fetchFeed(
        `https://www.themuse.com/api/public/jobs?page=${page}`,
        "json",
      );
      const rows = Array.isArray(payload?.results) ? payload.results : [];
      for (const row of rows) {
        const jobUrl =
          typeof row?.refs?.landing_page === "string"
            ? row.refs.landing_page
            : "";
        const title = typeof row?.name === "string" ? row.name.trim() : "";
        if (!jobUrl || !title || seen.has(jobUrl)) continue;
        const location = Array.isArray(row.locations)
          ? row.locations
              .map((value: any) => value?.name)
              .filter(Boolean)
              .join(", ")
          : "";
        const job = {
          source: "themuse" as const,
          sourceJobId: String(row.id ?? jobUrl),
          title,
          employer: row.company?.name ?? "The Muse",
          jobUrl,
          applicationLink: jobUrl,
          location,
          jobDescription: plain(row.contents),
          datePosted: row.publication_date,
          locationEvidence: locationEvidence(location, "themuse"),
        };
        if (!matchesTerms(job, options.terms)) continue;
        seen.add(jobUrl);
        jobs.push(job);
        if (jobs.length >= options.limit) break;
      }
      if (rows.length === 0) break;
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
