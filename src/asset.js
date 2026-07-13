// Resolves a public asset against the deploy base path (e.g. GitHub Pages
// serves the site under /pull-a-fry/, not the domain root).
export const asset = (p) => import.meta.env.BASE_URL + p
