import type { ManualJobDraft, WatchlistJobResult } from "@shared/types";

export type CareerOpsProvider =
  | "ashby"
  | "lever"
  | "smartrecruiters"
  | "icims"
  | "workable"
  | "teamtailor"
  | "jobvite";

export interface CareerOpsListing {
  sourceJobId: string;
  title: string;
  employer: string;
  jobUrl: string;
  applicationLink: string;
  location: string;
  description?: string;
  postedAt?: string;
  salary?: string;
  salaryMinAmount?: number;
  salaryMaxAmount?: number;
  salaryCurrency?: string;
  isRemote?: boolean;
  workplaceType?: "remote" | "hybrid" | "onsite";
  remoteScope?: "unrestricted" | "restricted" | "unspecified";
  eligibleCountryKeys?: string[];
}

const HOSTS: Record<CareerOpsProvider, string[]> = {
  ashby: ["api.ashbyhq.com", "jobs.ashbyhq.com"],
  lever: ["api.lever.co", "api.eu.lever.co", "jobs.lever.co"],
  smartrecruiters: ["api.smartrecruiters.com", "careers.smartrecruiters.com", "jobs.smartrecruiters.com"],
  icims: ["icims.com"],
  workable: ["apply.workable.com"],
  teamtailor: ["teamtailor.com"],
  jobvite: ["jobs.jobvite.com", "app.jobvite.com"],
};

function hostAllowed(provider: CareerOpsProvider, hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return HOSTS[provider].some((host) => lower === host || lower.endsWith(`.${host}`));
}

function safeUrl(provider: CareerOpsProvider, raw: unknown, allowExternal = false): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "https:") return null;
    if (!allowExternal && !hostAllowed(provider, parsed.hostname)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

async function request(url: string, kind: "json" | "text", signal?: AbortSignal): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await fetch(url, { redirect: "error", signal: controller.signal });
    if (!response.ok) throw new Error(`upstream returned ${response.status}`);
    return kind === "json" ? await response.json() : await response.text();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

async function retry<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await fn(); } catch (error) {
      last = error;
      if (signal?.aborted || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw last;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function remoteMeta(location: string, explicitRemote = false): Pick<CareerOpsListing, "isRemote" | "remoteScope" | "eligibleCountryKeys"> {
  const value = location.toLowerCase();
  const isRemote = explicitRemote || /remote|work from home|worldwide|anywhere|wfh/.test(value);
  if (!isRemote) return { isRemote: false };
  const restricted = /canada|europe|emea|asia|india|uk|united kingdom|australia|germany|france|latam|latin america|australia|new zealand/.test(value) && !/united states|usa|north america/.test(value);
  return {
    isRemote: true,
    remoteScope: restricted ? "restricted" : value === "remote" ? "unspecified" : "unrestricted",
    eligibleCountryKeys: /united states|usa|north america/.test(value) ? ["united states"] : undefined,
  };
}

function listing(args: Partial<CareerOpsListing> & Pick<CareerOpsListing, "sourceJobId" | "title" | "employer" | "jobUrl" | "location">): CareerOpsListing {
  return {
    sourceJobId: args.sourceJobId,
    title: args.title,
    employer: args.employer,
    jobUrl: args.jobUrl,
    applicationLink: args.applicationLink ?? args.jobUrl,
    location: args.location,
    ...remoteMeta(args.location, args.isRemote),
    ...args,
  };
}

function slugFrom(url: string): string | null {
  try { return new URL(url).pathname.split("/").filter(Boolean)[0] ?? null; } catch { return null; }
}

async function fetchAshby(url: string, employer: string, signal?: AbortSignal): Promise<CareerOpsListing[]> {
  const slug = slugFrom(url);
  if (!slug) return [];
  const api = safeUrl("ashby", `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`);
  if (!api) return [];
  const payload = await retry(() => request(api, "json", signal), signal);
  return (Array.isArray(payload?.jobs) ? payload.jobs : []).flatMap((job: any) => {
    const jobUrl = safeUrl("ashby", job.jobUrl, true);
    if (!jobUrl || typeof job.title !== "string") return [];
    const location = [job.location, ...(job.secondaryLocations ?? []).map((x: any) => x?.location)].filter(Boolean).join(" · ");
    return [listing({ sourceJobId: String(job.id ?? jobUrl), title: job.title.trim(), employer, jobUrl, location, description: text(job.descriptionPlain), applicationLink: safeUrl("ashby", job.applyUrl, true) ?? jobUrl, postedAt: job.publishedAt })];
  });
}

async function fetchLever(url: string, employer: string, signal?: AbortSignal): Promise<CareerOpsListing[]> {
  const slug = slugFrom(url);
  if (!slug) return [];
  const host = new URL(url).hostname.startsWith("jobs.eu.") ? "api.eu.lever.co" : "api.lever.co";
  const api = safeUrl("lever", `https://${host}/v0/postings/${slug}`);
  if (!api) return [];
  const payload = await request(api, "json", signal);
  return (Array.isArray(payload) ? payload : []).flatMap((job: any) => {
    const jobUrl = safeUrl("lever", job.hostedUrl, true);
    if (!jobUrl || typeof job.text !== "string") return [];
    const location = [job.categories?.location, ...(job.categories?.allLocations ?? [])].filter(Boolean).join("; ");
    return [listing({ sourceJobId: String(job.id ?? jobUrl), title: job.text.trim(), employer, jobUrl, location, description: text(job.descriptionPlain), applicationLink: safeUrl("lever", job.applyUrl, true) ?? jobUrl, postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : undefined })];
  });
}

async function fetchSmartRecruiters(url: string, employer: string, signal?: AbortSignal): Promise<CareerOpsListing[]> {
  const slug = slugFrom(url);
  if (!slug) return [];
  const out: CareerOpsListing[] = [];
  for (let offset = 0; offset < 5000 && out.length < 40; offset += 100) {
    const api = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=100&offset=${offset}&status=PUBLIC`;
    const payload = await request(api, "json", signal);
    const rows = Array.isArray(payload?.content) ? payload.content : [];
    for (const row of rows) {
      const jobUrl = safeUrl("smartrecruiters", row.ref, true) ?? `https://jobs.smartrecruiters.com/${slug}/${row.id}`;
      if (!row.id || !row.name) continue;
      const loc = row.location ?? {};
      const location = [loc.fullLocation, loc.city, loc.region, loc.country, loc.remote ? "Remote" : ""].filter(Boolean).join(", ");
      out.push(listing({ sourceJobId: String(row.id), title: String(row.name), employer, jobUrl, location }));
      if (out.length >= 40) break;
    }
    if (rows.length < 100) break;
  }
  for (const row of out.slice(0, 25)) {
    try {
      const detailUrl = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings/${encodeURIComponent(row.sourceJobId)}`;
      const detail = await request(detailUrl, "json", signal);
      const sections = detail?.jobAd?.sections;
      const description = sections && Object.values(sections).map((section: any) => text(section?.text)).filter(Boolean).join("\n");
      if (description) row.description = description;
      row.applicationLink = safeUrl("smartrecruiters", detail?.jobAd?.applyUrl, true) ?? row.applicationLink;
    } catch {
      // Detail enrichment is best effort; the listing remains usable.
    }
  }
  return out;
}

function parseCards(html: string, provider: CareerOpsProvider, employer: string, baseUrl = `https://${provider}.com`): CareerOpsListing[] {
  const out: CareerOpsListing[] = [];
  const cards = html.split(/(?:iCIMS_JobCardItem|data-job-id=|<item\b)/i).slice(1);
  for (const card of cards) {
    const href = card.match(/href=["']([^"']+)["']/i)?.[1];
    const title = text(card.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1] ?? card.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    if (!href || !title) continue;
    const jobUrl = safeUrl(provider, new URL(href, baseUrl).href, true);
    if (!jobUrl) continue;
    const location = text(card.match(/(?:Location|location|city)[^<:]*[:]?\s*<[^>]+>([\s\S]*?)<\//i)?.[1] ?? card.match(/<(?:location|region)[^>]*>([\s\S]*?)<\//i)?.[1]);
    out.push(listing({ sourceJobId: jobUrl, title, employer, jobUrl, location }));
    if (out.length >= 40) break;
  }
  return out;
}

async function fetchIcims(url: string, employer: string, signal?: AbortSignal): Promise<CareerOpsListing[]> {
  const parsed = new URL(url);
  if (!parsed.hostname.endsWith(".icims.com")) return [];
  const out: CareerOpsListing[] = [];
  for (let page = 0; page < 3 && out.length < 40; page += 1) {
    const html = await request(`${parsed.origin}/jobs/search?ss=1&pr=${page}&in_iframe=1`, "text", signal);
    const rows = parseCards(html, "icims", employer, parsed.origin);
    for (const row of rows) {
      try {
        const detail = await request(`${row.jobUrl}?in_iframe=1`, "text", signal);
        const description = detail.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1];
        const datePosted = detail.match(/"datePosted"\s*:\s*"([^"]+)"/i)?.[1];
        if (description) row.description = text(description);
        if (datePosted) row.postedAt = datePosted;
      } catch {
        // Keep the search-card result when detail enrichment is unavailable.
      }
      out.push(row);
      if (out.length >= 40) break;
    }
    if (rows.length === 0) break;
  }
  return out.slice(0, 40);
}

async function fetchWorkable(url: string, employer: string, signal?: AbortSignal): Promise<CareerOpsListing[]> {
  const slug = slugFrom(url);
  if (!slug) return [];
  const api = safeUrl("workable", `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`);
  if (!api) return [];
  let payload: any;
  try { payload = await retry(() => request(api, "json", signal), signal); } catch { payload = null; }
  const rows = Array.isArray(payload?.jobs) ? payload.jobs : [];
  return rows.slice(0, 40).flatMap((job: any) => {
    const jobUrl = safeUrl("workable", job.shortlink ?? job.url, true);
    if (!jobUrl || !job.title) return [];
    const location = [job.city, job.state, job.country].filter(Boolean).join(", ") || (job.telecommuting ? "Remote" : "");
    return [listing({ sourceJobId: String(job.shortcode ?? jobUrl), title: String(job.title), employer, jobUrl, location, description: text(job.description), applicationLink: jobUrl, postedAt: job.published_on ?? job.created_at })];
  });
}

async function fetchTeamtailor(url: string, employer: string, signal?: AbortSignal): Promise<CareerOpsListing[]> {
  const parsed = new URL(url);
  if (!parsed.hostname.endsWith(".teamtailor.com")) return [];
  const xml = await request(`https://${parsed.hostname}/jobs.rss`, "text", signal);
  return (xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []).slice(0, 40).flatMap((item) => {
    const tag = (name: string) => text(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1]);
    const jobUrl = safeUrl("teamtailor", tag("link"), true);
    const title = tag("title");
    if (!jobUrl || !title) return [];
    const location = [tag("tt:city"), tag("tt:country")].filter(Boolean).join(", ") || (tag("remoteStatus") ? "Remote" : "");
    return [listing({ sourceJobId: jobUrl, title, employer, jobUrl, location, postedAt: tag("pubDate") })];
  });
}

async function fetchJobvite(url: string, employer: string, signal?: AbortSignal): Promise<CareerOpsListing[]> {
  const parsed = new URL(url);
  let eid = parsed.searchParams.get("c");
  if (!eid && parsed.hostname === "jobs.jobvite.com") {
    const html = await request(`${parsed.origin}${parsed.pathname}?fr=true&nl=1`, "text", signal);
    eid = html.match(/companyEId\s*[:=]\s*["']([A-Za-z0-9_-]{4,40})["']/)?.[1] ?? null;
  }
  if (!eid) return [];
  const feed = `https://app.jobvite.com/CompanyJobs/Xml.aspx?c=${encodeURIComponent(eid)}`;
  const xml = await request(feed, "text", signal);
  return (xml.match(/<job>[\s\S]*?<\/job>/gi) ?? []).slice(0, 40).flatMap((job) => {
    const tag = (name: string) => text(job.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"))?.[1]);
    const raw = tag("detail-url") || tag("apply-url");
    const jobUrl = safeUrl("jobvite", raw, true);
    const title = tag("title");
    if (!jobUrl || !title) return [];
    return [listing({ sourceJobId: tag("id") || jobUrl, title, employer, jobUrl, location: tag("location"), applicationLink: safeUrl("jobvite", tag("apply-url"), true) ?? jobUrl, description: text(tag("description")), postedAt: tag("date") })];
  });
}

export async function fetchCareerOpsListings(provider: CareerOpsProvider, careersUrl: string, employer: string, signal?: AbortSignal): Promise<CareerOpsListing[]> {
  switch (provider) {
    case "ashby": return fetchAshby(careersUrl, employer, signal);
    case "lever": return fetchLever(careersUrl, employer, signal);
    case "smartrecruiters": return fetchSmartRecruiters(careersUrl, employer, signal);
    case "icims": return fetchIcims(careersUrl, employer, signal);
    case "workable": return fetchWorkable(careersUrl, employer, signal);
    case "teamtailor": return fetchTeamtailor(careersUrl, employer, signal);
    case "jobvite": return fetchJobvite(careersUrl, employer, signal);
  }
}

export function toWatchlistJob(provider: CareerOpsProvider, row: CareerOpsListing): Omit<WatchlistJobResult, "rowState" | "isNewSinceLastCheck" | "workspaceJob"> {
  return {
    jobRef: row.sourceJobId,
    source: `${provider}:${row.sourceJobId}`,
    sourceJobId: row.sourceJobId,
    sourceType: provider,
    title: row.title,
    employer: row.employer,
    jobUrl: row.jobUrl,
    applicationLink: row.applicationLink,
    location: row.location || null,
    postedAt: row.postedAt ?? null,
  };
}

export function toDraft(row: CareerOpsListing): ManualJobDraft {
  return {
    sourceJobId: row.sourceJobId,
    title: row.title,
    employer: row.employer,
    jobUrl: row.jobUrl,
    applicationLink: row.applicationLink,
    location: row.location,
    jobDescription: row.description,
    salary: row.salary,
  };
}
