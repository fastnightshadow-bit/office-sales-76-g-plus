const privateRobotsMeta = '<meta name="robots" content="noindex, nofollow" />';
const publicRobotsMeta = '<meta name="robots" content="index, follow" />';

export function getPublicationSite(siteUrl: string | undefined): URL | undefined {
  if (!siteUrl) return undefined;

  try {
    const parsed = new URL(siteUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
      return undefined;
    }
    parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/`;
    return parsed;
  } catch {
    return undefined;
  }
}

export function transformIndexForPublication(html: string, siteUrl: string | undefined): string {
  if (!getPublicationSite(siteUrl)) return html;
  if (html.includes(privateRobotsMeta)) return html.replace(privateRobotsMeta, publicRobotsMeta);
  return html.replace("</head>", `  ${publicRobotsMeta}\n  </head>`);
}
