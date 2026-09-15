import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/*
  Two content collections. Each is just a folder of Markdown files under
  src/content/. The `loader` tells Astro where to find them; the `schema`
  validates every file's frontmatter at build time, so a typo in a date or a
  missing title fails the build instead of shipping broken.
*/

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    // One-line summary used on the cards and index.
    description: z.string(),
    // Sorts the projects index (newest first). Just a year is fine: 2024.
    date: z.coerce.date(),
    // Technologies — rendered as a row of tags on the project page.
    tech: z.array(z.string()).default([]),
    // Any that apply; omit the rest.
    links: z
      .object({
        demo: z.string().url().optional(),
        repo: z.string().url().optional(),
        docs: z.string().url().optional(),
      })
      .default({}),
    // Show on the home page's "Featured projects" section.
    featured: z.boolean().default(false),
    // Hide from the site without deleting the file.
    draft: z.boolean().default(false),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/writing" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    // If this was first published elsewhere, link the original.
    canonicalUrl: z.string().url().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, writing };
