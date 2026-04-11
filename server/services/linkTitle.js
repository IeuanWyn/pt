const axios = require('axios');

/**
 * Decode common HTML entities in a string.
 */
function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2019;/g, '\u2019')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Extract the og:title from a raw HTML string.
 *
 * Strategy:
 *  1. Locate the complete <meta> tag that carries property="og:title"
 *  2. Extract the content attribute value from *that* tag
 *
 * Doing it in two steps avoids the "=""" artefact caused by naive regexes
 * that try to match property and content in a single pass and accidentally
 * pick up attribute names from elsewhere in the page HTML.
 */
function extractOgTitle(html) {
  // Match the full <meta … /> tag that contains property="og:title"
  // The property attribute may use single or double quotes.
  const metaTagRegex = /<meta\s[^>]*property=["']og:title["'][^>]*\/?>/i;
  const metaTag = metaTagRegex.exec(html);

  if (metaTag) {
    // Now extract content="…" from within that tag only
    const contentMatch = /\bcontent=["']([^"']+)["']/i.exec(metaTag[0]);
    if (contentMatch && contentMatch[1].trim()) {
      return decodeHtmlEntities(contentMatch[1].trim());
    }
  }

  // Some pages put content before property; handle that ordering too.
  const reversedRegex = /<meta\s[^>]*content=["']([^"'<>]+)["'][^>]*property=["']og:title["'][^>]*\/?>/i;
  const reversedMatch = reversedRegex.exec(html);
  if (reversedMatch && reversedMatch[1].trim()) {
    return decodeHtmlEntities(reversedMatch[1].trim());
  }

  return null;
}

/**
 * Fall back to the <title> element, stripping common site-name suffixes.
 */
function extractPageTitle(html) {
  const match = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  if (!match || !match[1].trim()) return null;

  return decodeHtmlEntities(match[1].trim())
    .replace(/\s*[|\-–—]\s*(ESPN|BBC|Sky Sports|The Guardian|The Times|Daily Mail|Mail Online|The Telegraph|The Sun|Reuters|AP News|The Athletic|NBC Sports)\s*$/i, '')
    .trim();
}

/**
 * Fetch the HTML at the given URL and return the best available page title.
 * Returns null if the fetch fails or no title can be found.
 */
async function fetchLinkTitle(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 8000,
      maxRedirects: 5,
      // Only parse enough HTML to find the <head> section
      responseType: 'text',
    });

    const html = response.data;

    // Work only on the <head> portion to avoid false matches in body content
    const headMatch = /(<head[\s>][\s\S]*?<\/head>)/i.exec(html);
    const searchTarget = headMatch ? headMatch[1] : html.slice(0, 10000);

    return extractOgTitle(searchTarget) || extractPageTitle(searchTarget);
  } catch (err) {
    console.error(`linkTitle: failed to fetch "${url}": ${err.message}`);
    return null;
  }
}

/**
 * Return all HTTP/HTTPS URLs found in a string.
 */
function extractUrls(text) {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  return text.match(urlRegex) || [];
}

module.exports = { fetchLinkTitle, extractUrls };
