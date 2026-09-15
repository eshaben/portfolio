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

## Overview

The Documentation Quality Agent is a Claude-powered agent I built as a personal project that audits a Markdown doc's code-related claims against a real reference repository. That covers two primary cases: a doc that's gone stale as the code changed, and a newly written doc whose claims were never accurate to begin with. Checking that by hand doesn't scale, so the agent does it instead, using a tool interface Claude calls to search and read the reference repo, looped until it can report back which claims don't hold up.

## Tech Stack

Python, the Claude API via the `anthropic` SDK, and `git grep` for searching the reference repo.

## In Action

Confirmed working end to end against a real target: Anthropic's own `anthropic-sdk-python` repo and a Markdown doc making claims about it. Packaged as an installable CLI (`docs-audit`) via a `pyproject.toml` entry point.

```
docs-audit -p examples/anthropic_sdk_doc.md -r https://github.com/anthropics/anthropic-sdk-python.git
```

→ [View `examples/anthropic_sdk_doc.md`](https://raw.githubusercontent.com/eshaben/documentation-quality-agent/refs/heads/main/examples/anthropic_sdk_doc.md)

The agent responded with the following report:

```md
## Audit Findings

I checked each code-related claim in the document against the reference repository. Here are the mismatches found:

**1. `max_tokens` defaults to 1024 — INACCURATE**
- **Document says:** "If you omit `max_tokens`, it defaults to 1024."
- **Actual code:** `max_tokens` is a **required** parameter with no default value.
- **Reference:** `src/anthropic/types/message_create_params.py:34` — `max_tokens: Required[int]` (also `src/anthropic/types/beta/message_create_params.py:36`)

**2. Automatic retries default to 5 — INACCURATE**
- **Document says:** "By default, the client automatically retries a failed request up to 5 times before raising an error."
- **Actual code:** The default max retries is **2**, not 5.
- **Reference:** `src/anthropic/_constants.py:8` — `DEFAULT_MAX_RETRIES = 2`

**3. Streaming method name `client.messages.stream_response()` — INACCURATE**
- **Document says:** "You can stream a response incrementally using `client.messages.stream_response()` as a context manager..."
- **Actual code:** The method is named `stream()`, not `stream_response()`. No `stream_response` public method exists anywhere in the SDK (the only occurrences of that string are internal helper method names like `_should_stream_response_body`, unrelated to the public streaming API).
- **Reference:** `src/anthropic/resources/messages/messages.py:1010` (sync `def stream(`) and `:2439` (async `def stream(`)
```