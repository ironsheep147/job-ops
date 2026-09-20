---
id: careerops-us
title: CareerOps US Sources
description: US-focused Built In, The Muse, and Hacker News job sources.
sidebar_position: 12
---

## What it is

CareerOps US Sources adds Built In, The Muse, Hacker News “Who Is Hiring?”, and remote/niche feeds to pipeline discovery. Employer ATS boards from CareerOps are available as Watchlist source types.

## Why it exists

These feeds add US startup, technology, and employer coverage without credentials or browser automation. Listings retain the public posting URL, application URL when supplied, description, posting date, and location evidence.

## How to use it

1. Set the search country to **United States**.
2. Choose the existing location scope that fits your policy. **Selected plus remote worldwide** is the balanced option.
3. Select Built In, The Muse, Hacker News, or a Phase 3 feed in the pipeline source list: Remote OK, Remotive, We Work Remotely, Jobicy, Himalayas, NoDesk, 4 Day Week, Cryptocurrency Jobs, Python.org Jobs, a16z Speedrun, Agentic Engineering Jobs, or Generalist World.
4. For employer boards, open Watchlist and choose an ATS type. Supported types include Ashby, Lever, SmartRecruiters, iCIMS, Workable, Teamtailor, and Jobvite.

Sources are public and bounded: Built In scans up to three pages per search term, The Muse scans up to 100 API pages, Hacker News scans the current monthly hiring thread, and Watchlist sources return at most 40 jobs per board.

## Common problems

- Use canonical provider URLs; branded ATS domains are not automatically resolved.
- A provider can return no jobs when its public feed is empty or its markup changes. The pipeline reports source errors without exposing upstream response bodies.
- A remote posting explicitly restricted to another country or region is excluded in balanced mode.

## Related pages

- [Extractors overview](/docs/next/extractors/overview)
- [Add an extractor](/docs/next/workflows/add-an-extractor)
- [Watchlist](/docs/next/features/watchlist)
