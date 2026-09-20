import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import {
  commonOptions,
  fetchFeed,
  locationEvidence,
  matchesTerms,
  plain,
} from "../../feed-utils/src/index";

const URL = "https://4dayweek.io/api/jobs?page=1";

export async function runFourdayweek(context: ExtractorRuntimeContext) {
  const options = commonOptions(context);
  if (options.cancelled()) return { success: true, jobs: [] };
  options.progress("fourdayweek: fetching listings");
  try {
    const payload = await fetchFeed(URL, "json");
    const rows = Array.isArray(payload)
      ? payload
      : (payload?.jobs ?? payload?.results ?? payload?.data ?? []);
    const jobs = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (options.cancelled()) break;
      const slug = typeof row?.slug === "string" ? row.slug : "";
      const title = typeof row?.title === "string" ? row.title.trim() : "";
      const jobUrl = slug ? `https://4dayweek.io/job/${slug}` : "";
      if (!title || !jobUrl) continue;
      const locations = Array.isArray(row?.locations)
        ? row.locations
            .map((location: unknown) => {
              if (!location || typeof location !== "object") return "";
              const value = location as Record<string, unknown>;
              return [value.city, value.state, value.country]
                .filter(
                  (part): part is string =>
                    typeof part === "string" && part.length > 0,
                )
                .join(", ");
            })
            .filter(Boolean)
        : [];
      const location = locations.join("; ") || "Remote";
      const company =
        typeof row?.company_name === "string"
          ? row.company_name
          : typeof row?.company?.name === "string"
            ? row.company.name
            : "4 Day Week employer";
      const job = {
        source: "fourdayweek" as const,
        sourceJobId: String(row?.id ?? jobUrl),
        title,
        employer: company,
        jobUrl,
        applicationLink: jobUrl,
        location,
        jobDescription: plain(
          [row?.category, row?.level, row?.schedule_type]
            .filter((value): value is string => typeof value === "string")
            .join(" | "),
        ),
        datePosted:
          typeof row?.posted === "number"
            ? new Date(row.posted * 1000).toISOString()
            : typeof row?.inserted === "string"
              ? row.inserted
              : undefined,
        locationEvidence: locationEvidence(
          location,
          "fourdayweek",
          /remote/i.test(location),
        ),
        isRemote: /remote/i.test(location),
      };
      if (seen.has(job.jobUrl) || !matchesTerms(job, options.terms)) continue;
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
