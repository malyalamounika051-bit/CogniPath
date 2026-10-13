import { config } from '../config/env.js';

/**
 * Clean & normalize a URL string. Returns null if invalid or unsafe.
 */
export function sanitizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Extract clean domain name from URL.
 */
export function extractDomain(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

/**
 * Trusted educational & academic domains get higher ranking.
 */
const TRUSTED_DOMAINS = [
  'wikipedia.org',
  'geeksforgeeks.org',
  'khanacademy.org',
  'britannica.com',
  'mit.edu',
  'stanford.edu',
  'harvard.edu',
  'nature.com',
  'sciencedirect.com',
  'nih.gov',
  'ncbi.nlm.nih.gov',
  'mdn.dev',
  'developer.mozilla.org',
  'w3schools.com',
  'baeldung.com',
  'tutorialspoint.com',
  'coursera.org',
];

/**
 * Filter, deduplicate, and score search results for educational relevance.
 */
export function filterAndRankResults(rawResults, targetTopic = '') {
  if (!Array.isArray(rawResults)) return [];

  const seenUrls = new Set();
  const seenTitles = new Set();
  const cleaned = [];

  const lowerTopicTerms = (targetTopic || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  for (const item of rawResults) {
    const title = (item.title || '').trim();
    const rawUrl = item.url || item.link;
    const url = sanitizeUrl(rawUrl);
    const snippet = (item.snippet || item.content || item.description || '').trim();
    const publishedDate = item.published_date || item.publishedDate || item.date || undefined;

    if (!title || !url) continue;

    // Deduplicate by URL and Title
    const normUrl = url.toLowerCase().replace(/\/$/, '');
    const normTitle = title.toLowerCase();
    if (seenUrls.has(normUrl) || seenTitles.has(normTitle)) continue;

    seenUrls.add(normUrl);
    seenTitles.add(normTitle);

    const domain = extractDomain(url);

    // Compute relevance score
    let score = 0;

    // Domain authority bonus
    if (TRUSTED_DOMAINS.some((d) => domain.includes(d) || domain.endsWith('.edu') || domain.endsWith('.gov') || domain.endsWith('.org'))) {
      score += 30;
    }

    // Keyword match in title
    for (const term of lowerTopicTerms) {
      if (normTitle.includes(term)) score += 20;
      if (snippet.toLowerCase().includes(term)) score += 10;
    }

    // Snippet quality
    if (snippet.length > 60) score += 10;

    cleaned.push({
      title,
      url,
      domain,
      snippet: snippet.slice(0, 500),
      publishedDate,
      score,
    });
  }

  // Sort descending by relevance score
  cleaned.sort((a, b) => b.score - a.score);

  return cleaned.slice(0, 6); // Keep top 6 most relevant sources
}

/**
 * Tavily Search API
 */
async function searchTavily(query, apiKey) {
  const endpoint = 'https://api.tavily.com/search';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        include_answer: false,
        max_results: 6,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Tavily HTTP error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const results = (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content || r.snippet,
      published_date: r.published_date,
    }));

    return results;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Exa Search API
 */
async function searchExa(query, apiKey) {
  const endpoint = 'https://api.exa.ai/search';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query,
        numResults: 6,
        useAutoprompt: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Exa HTTP error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const results = (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.text || r.snippet,
      published_date: r.publishedDate,
    }));

    return results;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Brave Web Search API
 */
async function searchBrave(query, apiKey) {
  const endpoint = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=6`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Brave HTTP error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const webResults = data.web?.results || [];
    return webResults.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      published_date: r.page_age,
    }));
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Main Web Search Dispatcher
 * Returns { results: Array, status: string, error?: string }
 */
export async function executeWebSearch(query, topic = '') {
  const apiKey = config.webSearchApiKey;
  const provider = (config.webSearchProvider || 'tavily').toLowerCase();

  if (!apiKey || !apiKey.trim()) {
    return {
      results: [],
      status: 'search_unavailable',
      message: 'Web search API key is not configured (WEB_SEARCH_API_KEY).',
    };
  }

  try {
    let rawResults = [];
    if (provider === 'tavily') {
      rawResults = await searchTavily(query, apiKey);
    } else if (provider === 'exa') {
      rawResults = await searchExa(query, apiKey);
    } else if (provider === 'brave') {
      rawResults = await searchBrave(query, apiKey);
    } else {
      // Default to tavily
      rawResults = await searchTavily(query, apiKey);
    }

    const filtered = filterAndRankResults(rawResults, topic || query);

    if (filtered.length === 0) {
      return {
        results: [],
        status: 'completed_with_limited_evidence',
        message: 'Search completed but returned no high-confidence relevant sources.',
      };
    }

    return {
      results: filtered,
      status: 'completed_with_sources',
    };
  } catch (err) {
    console.warn(`[SearchService] Web search failed via ${provider}:`, err.message);
    return {
      results: [],
      status: 'failed',
      error: err.message,
    };
  }
}
