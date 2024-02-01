import { env } from "../classes/Handlebars.js"

/**
 * Helper function to localize URLs (remove the host and protocol)
 * If the host of the parsed `url` is the same as website's, then the localized path is created
 * @param url - The URL to be processed
 */
export function localize(this: env, url: string): string {
  try {
    const parsedURL = new URL(url)
    const parsedWebsite = new URL(this.mrg.website)
    if (parsedURL.host === parsedWebsite.host) {
      url = parsedURL.pathname
    }
  } catch (error) {
    // do nothing
  }
  return url
}
