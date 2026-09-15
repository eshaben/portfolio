// Single source of truth for site-wide values. Edit these — nothing here is
// hardcoded into components.

export const SITE = {
  title: "Erin Shaben",
  // 1–2 sentence positioning statement, shown in the hero and used as the
  // default meta description.
  tagline:
    "Documentation Engineer Lead with a background in software engineering and developer relations.",
  // Absolute URL of the deployed site (no trailing slash). Used for canonical
  // links and social preview tags.
  url: "https://example.com", // TODO: Update to deployed website URL
};

// Contact + profile links. Set a value to null to hide that link everywhere.
export const CONTACT = {
  github: "https://github.com/eshaben",
  linkedin: "https://www.linkedin.com/in/eshaben",
};

// Prefixes an internal, root-relative path (e.g. "/projects", "/#about")
// with the site's base path, so links resolve correctly under whatever
// `base` is configured in astro.config.mjs (currently "/portfolio"). Strip
// any trailing slash first: BASE_URL isn't guaranteed to have one, and
// `path` always supplies its own leading slash.
export function withBase(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return path === "/" ? base || "/" : base + path;
}

// The persistent nav. `anchor: true` means it points at a section on the home
// page (rendered as /#id); otherwise it's a real route.
export const NAV_LINKS = [
  { label: "Home", href: "/", anchor: false },
  { label: "Projects", href: "/projects", anchor: false },
  { label: "Writing", href: "/writing", anchor: false },
  { label: "About", href: "/#about", anchor: true },
  { label: "Contact", href: "/#contact", anchor: true },
] as const;
