import type { CreateJobInput, JobLocationEvidence } from "@shared/types/jobs";

type Source = "builtin" | "themuse" | "hackernews";
type Workplace = "remote" | "hybrid" | "onsite";

export interface RunCareerOpsUsOptions {
  searchTerms?: string[];
  selectedCountry?: string;
  workplaceTypes?: Workplace[];
  maxJobs?: number;
  shouldCancel?: () => boolean;
  onProgress?: (detail: string) => void;
}

export interface RunCareerOpsUsResult {
  success: boolean;
  jobs: CreateJobInput[];
  sourceErrors?: string[];
  error?: string;
}

function plain(value: unknown): string {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function remoteEvidence(location: string, source: string, remote = false): JobLocationEvidence {
  const normalized = location.toLowerCase();
  const isRemote = remote || /remote|worldwide|anywhere|wfh|work from home/.test(normalized);
  const restricted = /canada|europe|emea|asia|india|uk|united kingdom|australia|germany|france|latam/.test(normalized) && !/usa|united states|north america/.test(normalized);
  return {
    location,
    rawLocation: location,
    source,
    isRemote,
    workplaceType: isRemote ? "remote" : /hybrid/i.test(location) ? "hybrid" : undefined,
    remoteScope: isRemote ? (restricted ? "restricted" : normalized === "remote" ? "unspecified" : "unrestricted") : undefined,
    eligibleCountryKeys: /usa|united states|north america/.test(normalized) ? ["united states"] : undefined,
  };
}

async function get(url: string, kind: "json" | "text"): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { redirect: "error", signal: controller.signal });
    if (!response.ok) throw new Error(`${response.status} from ${new URL(url).hostname}`);
    return kind === "json" ? await response.json() : await response.text();
  } finally { clearTimeout(timer); }
}

function matches(job: CreateJobInput, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = `${job.title} ${job.employer} ${job.jobDescription ?? ""}`.toLowerCase();
  return terms.some((term) => term.trim() && haystack.includes(term.trim().toLowerCase()));
}

async function builtIn(terms: string[], maxJobs: number, workplaceTypes?: Workplace[]): Promise<CreateJobInput[]> {
  const out: CreateJobInput[] = [];
  const seen = new Set<string>();
  const queries = terms.length ? terms : ["software engineer"];
  for (const query of queries) {
    const url = `https://builtin.com/jobs?search=${encodeURIComponent(query)}&page=1`;
    const html = await get(url, "text");
    const itemMatches = html.matchAll(/\{"@type":"ListItem"[^}]*?"name":"((?:[^"\\]|\\.)*)"[^}]*?"url":"((?:[^"\\]|\\.)*)"(?:[^}]*?"description":"((?:[^"\\]|\\.)*)")?\}/g);
    for (const match of itemMatches) {
      const title = JSON.parse(`"${match[1]}"`);
      const jobUrl = JSON.parse(`"${match[2]}"`);
      if (!title || !jobUrl || seen.has(jobUrl)) continue;
      seen.add(jobUrl);
      const location = /remote/i.test(html.slice(Math.max(0, (match.index ?? 0) - 500), (match.index ?? 0) + 1000)) ? "Remote" : "United States";
      const remote = location === "Remote";
      if (workplaceTypes?.length && !workplaceTypes.includes(remote ? "remote" : "onsite")) continue;
      const context = html.slice(Math.max(0, (match.index ?? 0) - 2500), (match.index ?? 0) + 1500);
      const employer = plain(context.match(/href=["']\/company\/[^"']+["'][^>]*>([\s\S]*?)<\//i)?.[1]) || "Built In employer";
      out.push({ source: "builtin", sourceJobId: jobUrl, title, employer, jobUrl, applicationLink: jobUrl, location, jobDescription: plain(match[3] ? JSON.parse(`"${match[3]}"`) : ""), locationEvidence: remoteEvidence(location, "builtin", remote) });
      if (out.length >= maxJobs) return out;
    }
  }
  return out;
}

async function theMuse(terms: string[], maxJobs: number): Promise<CreateJobInput[]> {
  const out: CreateJobInput[] = [];
  const seen = new Set<string>();
  for (let page = 0; page < 100 && out.length < maxJobs; page += 1) {
    const payload = await get(`https://www.themuse.com/api/public/jobs?page=${page}`, "json");
    const rows = Array.isArray(payload?.results) ? payload.results : [];
    for (const row of rows) {
      const jobUrl = typeof row?.refs?.landing_page === "string" ? row.refs.landing_page : "";
      const title = typeof row?.name === "string" ? row.name.trim() : "";
      if (!jobUrl || !title || seen.has(jobUrl)) continue;
      const location = Array.isArray(row.locations) ? row.locations.map((x: any) => x?.name).filter(Boolean).join(", ") : "";
      const job: CreateJobInput = { source: "themuse", sourceJobId: String(row.id ?? jobUrl), title, employer: row.company?.name ?? "The Muse", jobUrl, applicationLink: jobUrl, location, jobDescription: plain(row.contents), datePosted: row.publication_date, locationEvidence: remoteEvidence(location, "themuse") };
      if (!matches(job, terms)) continue;
      seen.add(jobUrl); out.push(job);
      if (out.length >= maxJobs) break;
    }
    if (rows.length === 0) break;
  }
  return out;
}

async function hackerNews(terms: string[], maxJobs: number): Promise<CreateJobInput[]> {
  const search = await get("https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=5", "json");
  const thread = search?.hits?.find((hit: any) => /ask hn[: ]+who is hiring/i.test(hit?.title ?? ""));
  if (!thread?.objectID) throw new Error("current Hacker News hiring thread was not found");
  const item = await get(`https://hn.algolia.com/api/v1/items/${thread.objectID}`, "json");
  const out: CreateJobInput[] = [];
  for (const child of Array.isArray(item?.children) ? item.children : []) {
    if (child?.dead || child?.deleted || typeof child?.text !== "string") continue;
    const description = plain(child.text);
    const first = description.split("\n").find(Boolean) ?? "";
    const parts = first.split("|").map((part: string) => part.trim());
    const employer = parts[0] || "HN Hiring";
    const title = parts[1] || first;
    const location = parts[2] || "";
    const external = description.match(/https?:\/\/[^\s<>()]+/)?.[0]?.replace(/[),.;]+$/, "");
    const jobUrl = `https://news.ycombinator.com/item?id=${child.id}`;
    const job: CreateJobInput = { source: "hackernews", sourceJobId: String(child.id), title, employer, jobUrl, applicationLink: external ?? jobUrl, location, jobDescription: description, datePosted: child.created_at, locationEvidence: remoteEvidence(location, "hackernews") };
    if (matches(job, terms)) out.push(job);
    if (out.length >= maxJobs) break;
  }
  return out;
}

export async function runCareerOpsUs(options: RunCareerOpsUsOptions = {}): Promise<RunCareerOpsUsResult> {
  const maxJobs = Math.max(1, Number.isFinite(options.maxJobs) ? Math.floor(options.maxJobs!) : 50);
  const terms = options.searchTerms ?? [];
  const jobs: CreateJobInput[] = [];
  const sourceErrors: string[] = [];
  for (const [source, fn] of [["builtin", () => builtIn(terms, maxJobs, options.workplaceTypes)], ["themuse", () => theMuse(terms, maxJobs)], ["hackernews", () => hackerNews(terms, maxJobs)]] as const) {
    if (options.shouldCancel?.()) break;
    options.onProgress?.(`CareerOps ${source}: fetching US listings`);
    try { jobs.push(...await fn()); } catch (error) { sourceErrors.push(`${source}: ${error instanceof Error ? error.message : "upstream failure"}`); }
  }
  return { success: sourceErrors.length < 3, jobs, sourceErrors };
}
