import * as cheerio from 'cheerio';

export interface ScrapedReview {
  rating: number;
  title: string;
  body: string;
  date: string;
  verified: boolean;
  helpful: number;
}

interface ScrapeResult {
  reviews: ScrapedReview[];
  productName: string;
  totalCount: number;
  source: string;
}

export async function scrapeAmazonReviews(url: string): Promise<ScrapeResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    return parseAmazonHtml(html, url);
  } catch (error: any) {
    console.error('Scrape error:', error.message);
    return {
      reviews: [],
      productName: 'Unknown Product',
      totalCount: 0,
      source: 'amazon',
    };
  }
}

function parseAmazonHtml(html: string, url: string): ScrapeResult {
  const $ = cheerio.load(html);
  const reviews: ScrapedReview[] = [];

  // Extract product name
  const productName = $('[data-hook="product-link"]').first().text().trim()
    || $('#productTitle').text().trim()
    || 'Unknown Product';

  // Parse review cards
  $('[data-hook="review"]').each((_, el) => {
    const $review = $(el);
    const ratingText = $review.find('[data-hook="review-star-rating"] .a-icon-alt').text().trim();
    const rating = parseFloat(ratingText) || 0;

    const title = $review.find('[data-hook="review-title"]').text().trim();
    const body = $review.find('[data-hook="review-body"]').text().trim();
    const date = $review.find('[data-hook="review-date"]').text().trim();
    const verified = $review.find('[data-hook="avp-badge"]').length > 0;
    const helpfulText = $review.find('[data-hook="helpful-vote-statement"]').text().trim();
    const helpfulMatch = helpfulText.match(/(\d+)/);
    const helpful = helpfulMatch ? parseInt(helpfulMatch[1]) : 0;

    if (body) {
      reviews.push({ rating, title, body, date, verified, helpful });
    }
  });

  return {
    reviews,
    productName,
    totalCount: reviews.length,
    source: 'amazon',
  };
}

export function parseReviewsFromText(text: string): ScrapedReview[] {
  const lines = text.split('\n').filter((l) => l.trim());
  const reviews: ScrapedReview[] = [];
  let currentReview: Partial<ScrapedReview> = {};

  for (const line of lines) {
    const ratingMatch = line.match(/^(\d)[\/\s]*[55]|stars?[:\s]*(\d)/i) || line.match(/rating[:\s]*(\d)/i);
    if (ratingMatch) {
      if (currentReview.body) {
        reviews.push({ rating: 3, title: '', body: '', date: '', verified: false, helpful: 0, ...currentReview });
      }
      currentReview = { rating: parseInt(ratingMatch[1] || ratingMatch[2]) || 3 };
      continue;
    }

    if (!currentReview.body) {
      currentReview.body = line;
    } else {
      currentReview.body += '\n' + line;
    }
  }

  if (currentReview.body) {
    reviews.push({ rating: 3, title: '', body: '', date: '', verified: false, helpful: 0, ...currentReview });
  }

  // If no structured format detected, treat each non-empty line as a review
  if (reviews.length === 0) {
    lines.forEach((line) => {
      if (line.trim().length > 10) {
        reviews.push({
          rating: 0,
          title: '',
          body: line.trim(),
          date: '',
          verified: false,
          helpful: 0,
        });
      }
    });
  }

  return reviews;
}

export function formatReviewsForAI(reviews: ScrapedReview[]): string {
  return reviews
    .map(
      (r, i) =>
        `[Review ${i + 1}] Rating: ${r.rating}/5${r.verified ? ' (Verified)' : ''}${r.helpful > 0 ? ` (${r.helpful} found helpful)` : ''}\nTitle: ${r.title || 'N/A'}\n${r.body}`
    )
    .join('\n\n---\n\n');
}
