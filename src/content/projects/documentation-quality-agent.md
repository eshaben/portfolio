---
title: "Documentation Quality Agent"
description: "A Claude-powered agent that audits a Markdown doc against a real reference repo and flags code-related claims that no longer match reality."
date: 2026-09-14
tech: ["Python", "Claude API", "Anthropic SDK"]
links:
  repo: "https://github.com/eshaben/documentation-quality-agent"
  # docs: TODO: Update
featured: true
draft: false
---

## What It Is

The Documentation Quality Agent is a Claude-powered agent I built as a personal project that audits a Markdown doc's code-related claims against a real reference repository. That covers two primary cases: a doc that's gone stale as the code changed, and a newly written doc whose claims were never accurate to begin with. Checking that by hand doesn't scale, so the agent does it instead, using a tool interface Claude calls to search and read the reference repo, looped until it can report back which claims don't hold up.

## Tech Stack

Python, the Claude API via the `anthropic` SDK, and `git grep` for searching the reference repo.

## Outcome

Confirmed working end to end against a real target: Anthropic's own `anthropic-sdk-python` repo and a Markdown doc making claims about it. The agent correctly used `search_code` to locate relevant claims before ever reading a file, and produced a final report distinguishing accurate claims from inaccurate ones with file and line references. Packaged as an installable CLI (`docs-audit`) via a `pyproject.toml` entry point.

