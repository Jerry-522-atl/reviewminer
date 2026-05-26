// Content script: scrapes reviews from Amazon & other e-commerce pages

(() => {
  function scrapeReviews() {
    const reviews = [];
    const url = location.href;

    // Amazon-specific selectors
    if (url.includes('amazon.')) {
      document.querySelectorAll('[data-hook="review"]').forEach((el) => {
        const title = el.querySelector('[data-hook="review-title"]')?.textContent?.trim() || '';
        const body = el.querySelector('[data-hook="review-body"]')?.textContent?.trim() || '';
        const rating = el.querySelector('[data-hook="review-star-rating"]')?.textContent?.trim() || '';
        const author = el.querySelector('.a-profile-name')?.textContent?.trim() || '';
        const date = el.querySelector('[data-hook="review-date"]')?.textContent?.trim() || '';
        const verified = el.querySelector('[data-hook="avp-badge"]')?.textContent?.trim() || '';

        if (body) {
          reviews.push({ title, body, rating, author, date, verified });
        }
      });
    }

    // Generic e-commerce review selectors (Shopee, Lazada, AliExpress, etc.)
    if (reviews.length === 0) {
      // Try common review card patterns
      const selectors = [
        '.review-card', '.review-item', '.review-container', '[class*="review"]',
        '.comment-item', '.comment-card', '.feedback-item', '.rating-item',
        '[data-testid="review"]', '[data-automation="review"]',
      ];

      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach((el) => {
          const text = el.textContent?.trim();
          if (text && text.length > 20 && text.length < 5000) {
            // Try to find rating stars
            const stars = el.querySelector('[class*="star"], [class*="rating"], [aria-label*="star"]');
            const ratingCount = (stars?.textContent?.match(/★|⭐/g) || []).length ||
                                (stars?.getAttribute('aria-label') || '').match(/(\d)/)?.[1] || '';
            reviews.push({
              title: '',
              body: text.slice(0, 2000),
              rating: ratingCount ? String(ratingCount) : '',
              author: '',
              date: '',
              verified: '',
            });
          }
        });
        if (reviews.length > 0) break;
      }
    }

    // Deduplicate
    const seen = new Set();
    return reviews.filter((r) => {
      const key = r.body.slice(0, 100);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getReviews') {
      const reviews = scrapeReviews();
      const productName = document.querySelector('#productTitle')?.textContent?.trim()
        || document.querySelector('[data-hook="product-title"]')?.textContent?.trim()
        || document.querySelector('h1')?.textContent?.trim()
        || 'Unknown Product';
      const url = location.href;
      sendResponse({ reviews, productName, url });
    }
    return true;
  });
})();
