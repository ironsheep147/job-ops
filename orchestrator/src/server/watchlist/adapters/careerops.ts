import {
  fetchCareerOpsListings,
  toDraft,
  toWatchlistJob,
  type CareerOpsProvider,
} from "@career-boards/careerops";
import type { ManualJobDraft, WatchlistSelectedSource } from "@shared/types";
import { z } from "zod";
import type { WatchlistCatalogSourceAdapter } from "./types";

const PROVIDERS: CareerOpsProvider[] = [
  "ashby",
  "lever",
  "smartrecruiters",
  "icims",
  "workable",
  "teamtailor",
  "jobvite",
  "eightfold",
  "oraclecloud",
  "phenom",
  "avature",
  "radancy",
  "successfactors",
  "jibeapply",
  "pinpoint",
  "recruitee",
  "rippling",
  "comeet",
  "collage",
  "cornerstone",
];

const LABELS: Record<CareerOpsProvider, string> = {
  ashby: "Ashby",
  lever: "Lever",
  smartrecruiters: "SmartRecruiters",
  icims: "iCIMS",
  workable: "Workable",
  teamtailor: "Teamtailor",
  jobvite: "Jobvite",
  eightfold: "Eightfold AI",
  oraclecloud: "Oracle Recruiting Cloud",
  phenom: "Phenom People",
  avature: "Avature",
  radancy: "Radancy",
  successfactors: "SAP SuccessFactors",
  jibeapply: "JibeApply",
  pinpoint: "Pinpoint",
  recruitee: "Recruitee",
  rippling: "Rippling",
  comeet: "Comeet",
  collage: "Collage HR",
  cornerstone: "Cornerstone OnDemand",
};

const URL_HINTS: Record<CareerOpsProvider, string> = {
  ashby: "https://jobs.ashbyhq.com/company",
  lever: "https://jobs.lever.co/company",
  smartrecruiters: "https://careers.smartrecruiters.com/company",
  icims: "https://careers-company.icims.com/jobs/search",
  workable: "https://apply.workable.com/company",
  teamtailor: "https://company.teamtailor.com",
  jobvite: "https://jobs.jobvite.com/company",
  eightfold: "https://company.eightfold.ai",
  oraclecloud: "https://company.fa.us2.oraclecloud.com",
  phenom: "https://careers.company.com",
  avature: "https://careers.company.com",
  radancy: "https://careers.company.com",
  successfactors: "https://jobs.company.com",
  jibeapply: "https://jobs.company.com",
  pinpoint: "https://company.pinpointhq.com",
  recruitee: "https://company.recruitee.com",
  rippling: "https://ats.rippling.com/company/jobs",
  comeet: "https://api.comeet.co",
  collage: "https://api.collage.co/v1/positions/site",
  cornerstone: "https://company.csod.com/ux/ats/careersite",
};

const sourceSchema = z.object({
  label: z.string().trim().min(1).max(200),
  careersUrl: z.string().trim().url().max(2000),
});

function sourceId(provider: CareerOpsProvider, url: string): string {
  return `${provider}:${url.replace(/\/$/, "")}`;
}

function canonicalUrl(provider: CareerOpsProvider, value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return provider === "ashby"
      ? host === "jobs.ashbyhq.com"
      : provider === "lever"
        ? /^jobs(?:\.eu)?\.lever\.co$/.test(host)
        : provider === "smartrecruiters"
          ? /^(careers|jobs)\.smartrecruiters\.com$/.test(host)
          : provider === "icims"
            ? host.endsWith(".icims.com")
            : provider === "workable"
              ? host === "apply.workable.com"
              : provider === "teamtailor"
                ? host.endsWith(".teamtailor.com")
                : provider === "jobvite"
                  ? host === "jobs.jobvite.com" || host === "app.jobvite.com"
                  : provider === "eightfold"
                    ? host.endsWith(".eightfold.ai")
                    : provider === "oraclecloud"
                      ? host.endsWith(".oraclecloud.com")
                      : provider === "pinpoint"
                        ? host.endsWith(".pinpointhq.com")
                        : provider === "recruitee"
                          ? host.endsWith(".recruitee.com")
                          : provider === "rippling"
                            ? host === "ats.rippling.com"
                            : provider === "comeet"
                              ? host.endsWith("comeet.co")
                              : provider === "collage"
                                ? host === "api.collage.co"
                                : provider === "cornerstone"
                                  ? host.endsWith(".csod.com")
                                  : ["phenom", "avature", "radancy", "successfactors", "jibeapply"].includes(provider);
  } catch {
    return false;
  }
}

function createAdapter(provider: CareerOpsProvider): WatchlistCatalogSourceAdapter {
  return {
    sourceType: provider,
    descriptor: {
      sourceType: provider,
      label: LABELS[provider],
      catalogLabel: `${LABELS[provider]} company board`,
      customSourceOptionLabel: `Choose your own ${LABELS[provider]} board`,
      customSourceSearchText: `custom ${provider} url`,
      customSourceInputLabel: `${LABELS[provider]} careers URL`,
      customSourcePlaceholder: URL_HINTS[provider],
      customSourceHelpText: `Paste a canonical ${LABELS[provider]} careers URL. The board is fetched without credentials and limited to the newest 40 jobs.`,
      emptyCatalogText: `No ${LABELS[provider]} boards configured.`,
      fetchingLabel: `Fetching from ${LABELS[provider]}...`,
      invalidUrlMessage: `Enter a valid canonical ${LABELS[provider]} careers URL.`,
      supportsCustomSource: true,
      supportsBranding: false,
    },
    catalogSchema: z.array(sourceSchema),
    parseCatalogSources(entries) {
      return z.array(sourceSchema).parse(entries).map((entry) => ({
        id: sourceId(provider, entry.careersUrl),
        label: entry.label,
        sourceType: provider,
        careersUrl: entry.careersUrl,
        cxsJobsUrl: null,
      }));
    },
    hydrateSelectedSource(source) {
      return { ...source, sourceType: provider };
    },
    async normalizeCustomSelection(input) {
      const parsed = new URL(input.careersUrl);
      if (parsed.protocol !== "https:") throw new Error("Careers URL must use HTTPS");
      if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$)/i.test(parsed.hostname)) {
        throw new Error("Private or local careers hosts are not allowed");
      }
      const careersUrl = parsed.href.replace(/\/$/, "");
      if (!canonicalUrl(provider, careersUrl)) throw new Error(`Use a canonical ${LABELS[provider]} careers URL`);
      return {
        label: input.label?.trim() || careersUrl,
        careersUrl,
      };
    },
    async fetchJobs(input) {
      const rows = await fetchCareerOpsListings(
        provider,
        input.source.careersUrl,
        input.source.label,
        input.signal,
      );
      const jobs = rows.map((row) => toWatchlistJob(provider, row));
      return { total: jobs.length, fetched: jobs.length, jobs };
    },
    async fetchJobDetails(input) {
      const rows = await fetchCareerOpsListings(
        provider,
        input.source.careersUrl,
        input.source.label,
        input.signal,
      );
      const row = rows.find((candidate) => candidate.sourceJobId === input.jobRef);
      if (!row) throw new Error(`Job ${input.jobRef} was not found on the board`);
      return { jobRef: input.jobRef, jobUrl: row.jobUrl, descriptionHtml: row.description ?? "" };
    },
    async prepareImportDraft(input) {
      const rows = await fetchCareerOpsListings(
        provider,
        input.source.careersUrl,
        input.source.label,
        input.signal,
      );
      const row = rows.find((candidate) => candidate.sourceJobId === input.jobRef);
      if (!row) throw new Error(`Job ${input.jobRef} was not found on the board`);
      const draft: ManualJobDraft = toDraft(row);
      return { draft, source: `${provider}:${row.sourceJobId}`, sourceHost: new URL(row.jobUrl).hostname };
    },
  };
}

export const careerOpsWatchlistAdapters = PROVIDERS.map(createAdapter);
