import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import type { CreateJobInput, JobLocationEvidence } from "@shared/types/jobs";

export type FeedSource = CreateJobInput["source"];

export async function fetchFeed(
  url: string,
  kind: "json" | "text",
): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(`${response.status} from ${new URL(url).hostname}`);
    return kind === "json" ? await response.json() : await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export function plain(value: unknown): string {
  return typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";
}

export function locationEvidence(
  location: string,
  source: string,
  remote = false,
): JobLocationEvidence {
  const normalized = location.toLowerCase();
  const isRemote =
    remote || /remote|worldwide|anywhere|wfh|work from home/.test(normalized);
  const restricted =
    /canada|europe|emea|asia|india|uk|united kingdom|australia|germany|france|latam/.test(
      normalized,
    ) && !/usa|united states|north america/.test(normalized);
  return {
    location,
    rawLocation: location,
    source,
    isRemote,
    workplaceType: isRemote
      ? "remote"
      : /hybrid/i.test(location)
        ? "hybrid"
        : undefined,
    remoteScope: isRemote
      ? restricted
        ? "restricted"
        : normalized === "remote"
          ? "unspecified"
          : "unrestricted"
      : undefined,
    eligibleCountryKeys: /usa|united states|north america/.test(normalized)
      ? ["united states"]
      : undefined,
  };
}

export function matchesTerms(job: CreateJobInput, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack =
    `${job.title} ${job.employer} ${job.jobDescription ?? ""}`.toLowerCase();
  return terms.some(
    (term) => term.trim() && haystack.includes(term.trim().toLowerCase()),
  );
}

export function maxJobs(context: ExtractorRuntimeContext): number {
  const parsed = Number.parseInt(
    context.settings.jobspyResultsWanted ?? "50",
    10,
  );
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 50;
}

export function commonOptions(context: ExtractorRuntimeContext) {
  return {
    terms: context.searchTerms,
    limit: maxJobs(context),
    cancelled: () => context.shouldCancel?.() ?? false,
    progress: (detail: string) =>
      context.onProgress?.({ phase: "list", detail }),
  };
}

export function rssRows(xml: string): Array<Record<string, string>> {
  return (xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []).map((item) => {
    const tag = (name: string) =>
      plain(
        item.match(
          new RegExp(
            `<${name}(?:\\:[^>]*)?[^>]*>([\\s\\S]*?)</${name}(?:\\:[^>]*)?>`,
            "i",
          ),
        )?.[1],
      );
    return {
      title: tag("title"),
      url: tag("link") || tag("guid"),
      description: tag("description") || tag("encoded"),
      location: tag("region") || tag("location") || tag("category"),
      postedAt: tag("pubDate") || tag("published"),
      employer: tag("creator"),
    };
  });
}

export function genericJob(
  source: FeedSource,
  row: Record<string, unknown>,
): CreateJobInput | null {
  const title = String(
    row.title ?? row.position ?? row.name ?? row.jobTitle ?? "",
  ).trim();
  const jobUrl = String(
    row.url ?? row.job_url ?? row.link ?? row.apply_url ?? "",
  ).trim();
  if (!title || !/^https:\/\//i.test(jobUrl)) return null;
  const location = String(
    row.location ??
      row.candidate_required_location ??
      row.locations ??
      row.city ??
      row.country ??
      (row.remote ? "Remote" : ""),
  ).trim();
  const remote = Boolean(
    row.is_remote ?? row.remote ?? /remote|worldwide|anywhere/i.test(location),
  );
  return {
    source,
    sourceJobId: String(row.id ?? row.slug ?? jobUrl),
    title,
    employer: String(
      row.company_name ??
        row.company ??
        row.employer ??
        row.organization ??
        "Remote employer",
    ).trim(),
    jobUrl,
    applicationLink: String(row.apply_url ?? row.applyUrl ?? jobUrl),
    location,
    jobDescription:
      plain(
        row.description ??
          row.contents ??
          row.descriptionPlain ??
          row.excerpt ??
          "",
      ) || undefined,
    datePosted:
      String(
        row.publication_date ??
          row.published_at ??
          row.publishedAt ??
          row.date ??
          "",
      ) || undefined,
    locationEvidence: locationEvidence(location, String(source), remote),
    isRemote: remote,
  };
}
