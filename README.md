# Portfolio

My personal portfolio site: projects and writing, built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com).

Live at [eshaben.github.io/portfolio](https://eshaben.github.io/portfolio).

## Getting started

```sh
npm install
npm run dev
```

The dev server runs at `localhost:4321`.

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Tailwind

Styling uses Tailwind CSS v4, wired in via the `@tailwindcss/vite` plugin in `astro.config.mjs` (no separate Tailwind config file needed). Global styles live in `src/styles/global.css`.

## Project structure

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets              # images and other static assets
│   ├── components           # Astro components (nav, footer, cards, etc.)
│   ├── content
│   │   ├── projects        # project write-ups (content collection)
│   │   └── writing         # blog posts (content collection)
│   ├── content.config.ts   # content collection schemas
│   ├── consts.ts           # site-wide values: title, tagline, nav links, contact info
│   ├── layouts             # page layouts (base, project, writing)
│   ├── pages
│   │   ├── index.astro
│   │   ├── projects/       # projects listing + [slug] detail page
│   │   └── writing/        # writing listing + [slug] detail page
│   └── styles
│       └── global.css
└── package.json
```
