---
title: "MkDocs Page Toggle Plugin"
description: "A MkDocs plugin I built at PaperMoon that lets one canonical page present multiple content variants through an interactive toggle, keeping guides with genuinely different implementations in one findable place."
date: 2026-01-27
tech: ["Python", "MkDocs", "JavaScript", "CSS"]
links:
  repo: "https://github.com/papermoonio/mkdocs-plugins/tree/main/plugins/page_toggle"
  docs: "https://github.com/papermoonio/mkdocs-plugins/blob/main/docs/page-toggle.md"
featured: true
draft: false
---

## What It Is

The Page Toggle plugin is a MkDocs plugin I built while working at PaperMoon. It lets a single canonical page present multiple variants of a guide, like the same task walked through for two different smart contract environments, and lets readers switch between them with an interactive toggle. The implementations differ enough to warrant their own separate write-ups, but the plugin keeps them together on one page so readers don't have to go hunting for the variant they need.

## My Role

I designed and built this on my own, extending Material for MkDocs. The plugin hooks into two build-time events: `on_page_content`, which captures each variant's rendered HTML and table of contents as pages build, and `on_post_build`, which assembles the toggle UI onto the canonical page and removes the standalone variant pages from the final built site, leaving one root URL that readers can toggle back and forth on.

## Tech Stack

Python, MkDocs, and BeautifulSoup for parsing and rewriting page HTML during the build. The toggle's client-side behavior and styling (`toggle-pages.js` and `toggle-pages.css`) are companion files I also wrote; they aren't part of the plugin package itself, since MkDocs loads them from each docs site's own repo via `extra_javascript`/`extra_css` in `mkdocs.yml`. Example versions of both live in the [plugin's docs](https://github.com/papermoonio/mkdocs-plugins/blob/main/docs/page-toggle.md).

## In Action

![The EVM variant of a Hardhat setup guide, with an EVM/PVM toggle in the top right](/images/page-toggle-canonical.png)

Toggling to **PVM** swaps in that variant's content in place, including the page title, intro, and table of contents:

![The same page after toggling to PVM, showing different content and the PVM tab selected](/images/page-toggle-variant.png)
