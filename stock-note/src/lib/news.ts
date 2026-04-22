/**
 * 뉴스 수집: Yahoo Finance 내장 + 구글 뉴스 RSS + Reddit (해외).
 * 모든 fetch는 실패해도 빈 배열 반환 (요약 생성은 best-effort).
 */

export type NewsSnippet = {
  headline: string;
  source: string;
  url?: string;
  publishedAt?: string;
};

type YahooSearchNews = {
  news?: Array<{
    title?: string;
    publisher?: string;
    link?: string;
    providerPublishTime?: Date | number;
  }>;
};

/** Yahoo Finance 검색 API의 news 섹션 */
export async function fetchYahooNews(
  ticker: string,
  dateFrom?: string
): Promise<NewsSnippet[]> {
  try {
    const mod = await import("yahoo-finance2");
    const yf = new mod.default();
    const res = (await yf.search(ticker, {
      newsCount: 10,
      quotesCount: 0,
    })) as unknown as YahooSearchNews;
    const items = res?.news ?? [];
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : 0;
    const toMs = (t: Date | number | undefined): number | undefined => {
      if (!t) return undefined;
      if (t instanceof Date) return t.getTime();
      return t * 1000;
    };
    return items
      .filter((n) => n.title && n.publisher)
      .filter((n) => {
        const ms = toMs(n.providerPublishTime);
        return !fromTs || ms === undefined || ms >= fromTs;
      })
      .map((n) => {
        const ms = toMs(n.providerPublishTime);
        return {
          headline: n.title!,
          source: n.publisher!,
          url: n.link,
          publishedAt: ms ? new Date(ms).toISOString() : undefined,
        };
      });
  } catch (e) {
    console.error(`[fetchYahooNews] ${ticker}:`, e);
    return [];
  }
}

/**
 * 구글 뉴스 RSS. 한국어 쿼리 가능.
 * 형식: https://news.google.com/rss/search?q=...&hl=ko&gl=KR
 */
export async function fetchGoogleNewsRss(
  query: string,
  opts: { lang?: "ko" | "en"; max?: number } = {}
): Promise<NewsSnippet[]> {
  const { lang = "ko", max = 10 } = opts;
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
      query
    )}&hl=${lang}&gl=${lang === "ko" ? "KR" : "US"}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 stock-note/1.0" },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    // 아주 단순한 RSS 파서 (item 블록 추출)
    const items: NewsSnippet[] = [];
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    for (const block of itemMatches.slice(0, max)) {
      const title = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const link = block.match(/<link>([\s\S]*?)<\/link>/);
      const pub = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const source = block.match(/<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/);
      if (!title) continue;
      const headline = title[1].trim().replace(/&quot;/g, '"').replace(/&amp;/g, "&");
      items.push({
        headline,
        source: source?.[1]?.trim() ?? "Google 뉴스",
        url: link?.[1]?.trim(),
        publishedAt: pub ? new Date(pub[1]).toISOString() : undefined,
      });
    }
    return items;
  } catch (e) {
    console.error(`[fetchGoogleNewsRss] ${query}:`, e);
    return [];
  }
}

/**
 * Reddit 해외주식 게시물 (r/stocks, r/investing, r/wallstreetbets).
 * 공식 공개 JSON 엔드포인트. ticker 심볼로 검색.
 */
export async function fetchRedditPosts(
  ticker: string,
  opts: { limit?: number; timeframe?: "day" | "week" | "month" | "year" } = {}
): Promise<NewsSnippet[]> {
  const { limit = 5, timeframe = "week" } = opts;
  try {
    const subs = "stocks+investing+wallstreetbets";
    const url = `https://www.reddit.com/r/${subs}/search.json?q=${encodeURIComponent(
      ticker
    )}&restrict_sr=on&sort=top&t=${timeframe}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "stock-note:0.1 (personal use)" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { children?: Array<{ data?: { title?: string; permalink?: string; created_utc?: number; subreddit?: string } }> };
    };
    const children = json.data?.children ?? [];
    return children
      .map((c) => c.data)
      .filter((d): d is NonNullable<typeof d> => !!d?.title)
      .map((d) => ({
        headline: d.title!,
        source: `r/${d.subreddit ?? "reddit"}`,
        url: d.permalink ? `https://reddit.com${d.permalink}` : undefined,
        publishedAt: d.created_utc
          ? new Date(d.created_utc * 1000).toISOString()
          : undefined,
      }));
  } catch (e) {
    console.error(`[fetchRedditPosts] ${ticker}:`, e);
    return [];
  }
}
