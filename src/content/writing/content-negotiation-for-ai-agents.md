---
title: "Content Negotiation for AI Agents: What the Request Header Actually Shows"
description: "Testing whether AI clients actually identify themselves the way content negotiation assumes — and what the real header data means for detecting AI traffic server-side."
pubDate: 2026-04-24
tags: ["Blog"]
featured: true
draft: false
---

So, what is content negotiation? In short, it means a server sends different content for the same URL depending on who's asking. Think serving JSON to an app and HTML to a browser. It's not a new idea, but it's found a new use case with AI agents: detecting AI clients and serving them a simplified Markdown version of a page instead of full HTML.

Several companies have recently come out claiming that AI agents identify themselves via an `Accept: text/markdown` header. [Sentry](https://cra.mr/optimizing-content-for-agents/) and [Avail](https://docs.availproject.org/docs/ai-features#content-negotiation) both wrote about their approach, so I decided to test that assumption directly. Claude is the primary AI tool I use day-to-day, so it's the main focus here, but I also captured headers from ChatGPT, Gemini, and other AI clients to see how broadly the assumption holds.

## How Claude Retrieves Data

When a user asks a question, if the information is not in the training knowledge or uploaded by the user, Claude can:

- Perform a **[Web Search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)**: Claude sends a search query to a search engine to retrieve relevant information.
- Perform a **[Web Fetch](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool)**: Given a specific URL, or if a search returns one worth reading fully, Claude fetches the entire page content and extracts the relevant information.

There's only so much information docs teams can make available via Web Search (think meta titles and descriptions). So we need to focus on how Claude interacts with our documentation sites via Web Fetch.

### What Happens When Claude Fetches a Page

Web Fetch is a tool call that Claude (and other AIs like Gemini) makes by passing a URL to an intermediary service. That service retrieves the page, strips out HTML tags, navigation menus, and other boilerplate, and returns a cleaned-up plain text version, essentially a Markdown-like representation of the content.

This stripping happens outside of Claude's context window, so it doesn't consume tokens. However, the cleaned text that comes back does count toward Claude's token limit. A long page is still a long page, even after cleaning.

This means the one thing we can directly control is how much meaningful text remains after stripping, assuming stripping happens cleanly in the first place. Not every client strips reliably, and even when it does, the process is heuristic and can misfire. That's the real case for content negotiation: serving Markdown directly guarantees exactly what the model sees, rather than hoping the stripping step got it right.

## Experiment: What Headers Do AI Clients Actually Send?

Content negotiation, in this context, only works if AI clients actually identify themselves the way it assumes, via an `Accept: text/markdown` header. So the real question is: does Claude actually send that header? To find out, I ran a simple test to capture the exact HTTP headers Claude sends when fetching a URL.

**Method**:

I used [webhook.site](https://webhook.site/) to capture incoming request headers by having Claude fetch a unique listener URL across two environments: the Claude.ai web interface and Claude Code (the CLI tool).

**Results**:

- Claude.ai Web
  - User-Agent: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)`
  - Accept: `*/*`

- Claude Code
  - User-Agent: `axios/1.13.6`
  - Accept: `text/markdown, text/html, */*`

**Key findings**:

- **They use different request paths entirely**: The web interface routes through an Anthropic intermediary service that mimics a browser and handles HTML stripping internally. Claude Code makes direct HTTP requests from the machine it's running on via the Axios library.
- **Claude.ai is identifiable by user-agent**: The `Claude-User/1.0` string in the user-agent means we can detect and serve optimized content specifically for Claude.ai web fetches.
- **Claude Code explicitly prefers Markdown**: The `Accept: text/markdown` header means if our server serves a Markdown content type, Claude Code will consume it directly — no stripping or conversion needed.
- **Claude.ai accepts anything**: The `Accept: */*` header means it won't automatically trigger a Markdown response, so user-agent detection is necessary to identify requests from Claude here.

<details>
  <summary>👉 Testing Additional AIs</summary>

  - Gemini Web App
    - User-Agent: `Google`
    - Accept: `*/*`
 
  - Gemini CLI
    - User-Agent: `Mozilla/5.0 (compatible; Google-Gemini-CLI/1.0; +https://github.com/google-gemini/gemini-cli)`
    - Accept: `*/*`

  - ChatGPT
    - User-Agent: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot`
    - Accept: `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9`
  
  - Codex CLI (the first fetch failed on DNS resolution inside the sandbox, so curl was used instead)
    - User-Agent: `curl/8.7.1`
    - Accept: `*/*`
  
  - Copilot
    - User-Agent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.109.5 Chrome/142.0.7444.265 Electron/39.3.0 Safari/537.36`
    - Accept: `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7`
  
  - Copilot browser (https://copilot.microsoft.com/)
    - User-Agent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36`
    - Accept: `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7`
  
  - Grok (sent multiple requests to fetch the same URL, each with a different `User-Agent`)
  
    - Request 1:
        - User-Agent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36`
        - Accept: `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7`
  
    - Request 2:
        - User-Agent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15`
        - Accept: `text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`

  - Grok CLI (live search doesn't work)

  - Perplexity free web app (live search doesn't work)
  
  - Perplexity Comet browser
    - User-Agent: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)`
    - Accept: n/a

  - Cursor
    - User-Agent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36`
    - Accept: `text/markdown,text/html;q=0.9,application/xhtml+xml;q=0.8,application/xml;q=0.7,image/webp;q=0.6,*/*;q=0.5`
  
  - Windsurf
    - User-Agent: `colly - https://github.com/gocolly/colly` (too generic to target)
    - Accept: `*/*`
  
  - Aider CLI
    - User-Agent: `Mozilla./5.0 (Aider/0.86.2 +https://aider.chat/)`
    - Accept: `*/*`
  
  - Aider CLI w/ Playwright
    - User-Agent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.6 Safari/537.36 Aider/0.86.2 +https://aider.chat/`
    - Accept: `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7`
  
  - OpenCode
    - User-Agent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36`
    - Accept: `text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1`
  
  - Codex
    - User-Agent: `curl/8.7.1`
    - Accept: `*/*`
  
</details>

**Note:** Of all the AI clients tested, only Claude Code, Cursor, and OpenCode sent `Accept: text/markdown` — the header that content negotiation relies on. This raises questions about how broadly applicable the approach is.

## A More Reliable Detection Strategy

The experiment reveals that no single approach works across all AI clients. Instead, we should implement a two-signal detection strategy based on what we can reliably observe in the request headers.

### Signal 1: User-Agent Detection

Several AI clients identify themselves clearly in the user-agent string:

- Claude.ai → Claude-User/1.0
- ChatGPT → ChatGPT-User/1.0
- Claude Code → axios/1.13.6 (less reliable as a signal since Axios is a generic library)
- Gemini CLI → Google-Gemini-CLI/1.0

For these clients, we can detect the request server-side and return a stripped-down, Markdown-formatted response — even if they don't explicitly request it.

### Signal 2: Accept Header Detection

Only Claude Code, Cursor, and OpenCode explicitly send `Accept: text/markdown`. This is the cleanest signal and maps directly to the content negotiation pattern that Sentry and Avail have implemented. When this header is present, serve a Markdown response directly.

**Recommended Implementation**: 

Use the following priority order when a request comes in:

- If `Accept` contains `text/markdown` → serve Markdown
- Else if `User-Agent` contains a known AI identifier → serve Markdown
- Else → serve the normal HTML page

### Clients That Cannot Be Reliably Detected

- **Codex CLI** fell back to curl, which is generic and indistinguishable from other curl requests
- **Copilot** sends a standard browser-like user-agent with no AI-specific identifier
- **Grok** sent multiple requests with generic browser user-agents, making detection unreliable

## Conclusion

The assumption behind content negotiation, that AI clients identify themselves via an `Accept: text/markdown` header, is only partially correct, and that distinction matters. Rather than relying on a single detection signal, a two-signal strategy that combines `Accept` header detection with `User-Agent` identification gives a broader, more reliable coverage across the AI clients users are likely using. Ideally, more agents converge on sending `Accept: text/markdown` over time, making header-based negotiation a reliable single-signal approach. But there's no guarantee that happens, or on what timeline, so the two-signal approach is a recommendation based on today's inconsistent landscape, not a bet on where it's headed. For the clients we can't detect, clean and focused content remains the most durable optimization that can be made.