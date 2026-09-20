---
id: us-boards
title: US Job Boards
description: Amazon, IBM, HigherEdJobs, and configurable US ATS and talent-network sources.
sidebar_position: 12
---

## What it is

Job Ops now includes direct US coverage for Amazon/AWS, IBM Careers, and HigherEdJobs. The watchlist also supports Breezy HR, Gem, Consider, and Getro boards.

## Why it exists

These sources add enterprise, higher-education, startup, and VC portfolio coverage that broad aggregators can miss. The direct extractors use public HTTPS APIs or RSS and apply the normal Job Ops search-term and result-limit controls.

## How to use it

Select `Amazon / AWS`, `IBM Careers`, or `HigherEdJobs` in a pipeline run. Amazon is narrowed to United States listings automatically; IBM uses its United States facet; HigherEdJobs uses its public category feed.

For company-specific sources, create a watchlist source and paste a canonical URL:

- Breezy HR: `https://company.breezy.hr`
- Gem: `https://jobs.gem.com/company` or a pinned `api.gem.com` job-board URL
- Consider: append the board id as `?board=<board-id>` when the URL does not expose it
- Getro: append the collection id as `?collection=<collection-id>` when it cannot be discovered from the board URL

## Common problems

- A board with no results may have changed its public response shape or may be temporarily rate-limited.
- Consider and Getro require a board or collection identifier because their hosts are shared by many independent networks.
- Gem and Breezy support only public HTTPS boards; private, local, or authenticated endpoints are rejected.
- Search terms are applied locally after the upstream response is normalized.

## Related pages

- [/docs/next/extractors/overview](/docs/next/extractors/overview)
- [/docs/next/workflows/add-an-extractor](/docs/next/workflows/add-an-extractor)
