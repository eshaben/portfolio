---
title: "How AI Actually Reads Your Docs"
description: "How AI crawlers and reactive fetching tools discover, process, and surface documentation,and what that means for how docs should be written."
pubDate: 2025-12-14
tags: ["Blog"]
featured: true
draft: false
---

Developers are no longer the only ones reading your documentation. AI agents, crawlers, and LLMs are now querying your knowledge base in ways that look nothing like a human browsing a docs site, and most documentation isn't built for that. Understanding how AI actually accesses and consumes your docs is the first step to making sure it does so accurately.

There are a few ways a user accesses and queries a docs knowledge base today:

- Searching the docs site directly — the traditional path, keyword-based, not AI
- Using an AI tool that has already crawled or indexed, or fetched your docs
- Dropping your docs directly into an agent
- Querying a RAG-powered assistant built on top of your docs

The first three happen naturally: a user or tool finds and uses your docs with little to no setup. The fourth requires someone to build and maintain a retrieval pipeline, making it more of an infrastructure decision than a docs decision.

## How AI Tools Discover Your Docs

Not all AI tools find your documentation the same way, and the difference matters more than most docs teams realize. These are the mechanisms worth understanding:

- **Crawlers**: Tools that systematically process your docs before any user interaction. There are two types:

    - **Training crawlers**: Companies like OpenAI, Anthropic, and Google crawl the web to build the datasets their models learn from. Your docs may end up in that training data, which is how an AI can "know" about your protocol without ever being explicitly pointed at your docs. This knowledge has a cutoff date though, meaning it can be outdated or incomplete. You can control whether training crawlers access your docs via robots.txt.

    - **Proactive crawlers**: Tools like Cursor and Perplexity proactively crawl and index docs sites, building a live index that they query in real time. When a developer asks a question, the tool pulls the most relevant content from your docs automatically, without the developer doing anything. This is systematic, persistent, and happens in the background.

- **Reactive fetching**: Some tools, like Claude, don't maintain a live index of your docs. Instead they retrieve content on demand, through web search or when a user shares a URL or triggers a web search. Nothing is stored or indexed beyond that interaction. Every conversation starts fresh.

Understanding which mechanism a tool uses matters because it determines how current, complete, and accessible your docs are to that tool, and ultimately to the developer using it.

Here's a quick reference:

|               | Training crawlers            | Proactive crawlers          | Reactive fetching              |
|---------------|------------------------------|-----------------------------|--------------------------------|
| **When**      | Before you ever use the tool | Before you ask a question   | At the moment you ask          |
| **Why**       | To train the model           | To build a searchable index | To answer a specific query     |
| **Persists?** | Yes, baked into the model    | Yes, maintained index       | No, gone after the interaction |
| **Example**   | OpenAI, Anthropic, Google    | Cursor, Perplexity          | Claude via web search or URL   |

Understanding these mechanisms is useful, but the more practical question is what, if anything, you can do to influence them.

## Optimizations for Crawlers

The key thing to understand about crawlers is that your content gets chunked into smaller pieces, converted into vector embeddings, and stored in a searchable index. By the time a developer asks a question, your docs have already been processed: the crawler isn't reading your docs live, it's querying what it stored earlier.

You don't control how your content gets chunked or stored, but the quality and structure of what gets crawled directly affects how accurately your docs get surfaced.

**What you can do**:

- **Maintain a sitemap**: Ensures crawlers find all your content, not just what's prominently linked.
- **Use clear, descriptive headings**: Helps crawlers categorize content correctly when chunking.
- **Write self-contained sections**: Chunks don't always land on clean boundaries, so each section should make sense on its own.
- **Keep a consistent URL structure**: Helps crawlers understand the hierarchy of your content.
- **Avoid JavaScript-heavy rendering**: Some crawlers struggle with content that only loads client-side.
- **Block training crawlers if needed**: Via `robots.txt` if you don't want your docs used as training data.
- **Publish an `llms.txt` file**: An emerging convention, not a guarantee: most crawlers and agents don't look for it yet, so its value depends on whether the specific tool you care about supports it.

## Optimizations for Fetches

Unlike crawlers, reactive fetching happens in the moment. When a developer asks a question, the tool fetches your docs in real time, through a web search or a URL, and drops the raw content directly into the model's context window. There's no pre-processing, no chunking, no index. The model reads your docs as-is, in full, all at once.

This is fundamentally different from how crawlers work. Instead of querying a pre-built index of your content, the model is reading your docs much more like a human would: linearly, in context, with everything visible at once.

That has a direct implication for how your docs should be written. Because the model is holding your entire page in view simultaneously, clarity and structure have an immediate and observable impact on the quality of answers it produces. There's no retrieval step to blame if the answer is wrong: if the model gets it wrong, it's likely because your docs were unclear, contradictory, or poorly structured.

**What you can do**:

- **Write clearly and explicitly**: The model is literal, it won't infer what you meant.
- **Avoid contradictions**: If your docs say two different things, the model may blend them or get confused.
- **Front-load important information**: Models tend to attend more strongly to the beginning and end of long content.
- **Keep pages focused**: A page that covers one topic clearly is more useful than one that covers many topics loosely.
- **Use consistent terminology**: Switching between terms for the same concept confuses both humans and models.