// Content script: scrapes reviews from Amazon & other e-commerce pages
(function() {
  function scrapeReviews() {
    var reviews = [];
    var url = location.href;

    if (url.indexOf('amazon.') >= 0 || url.indexOf('amzn.') >= 0) {
      var reviewEls = document.querySelectorAll('[data-hook="review"]');
      for (var i = 0; i < reviewEls.length; i++) {
        var el = reviewEls[i];
        var title = '';
        var titleEl = el.querySelector('[data-hook="review-title"], a.a-text-bold');
        if (titleEl) title = titleEl.textContent.trim();

        var body = '';
        var bodyEl = el.querySelector('[data-hook="review-body"], [data-hook="reviewText"]');
        if (bodyEl) body = bodyEl.textContent.trim();

        var rating = '';
        var ratingEl = el.querySelector('[data-hook="review-star-rating"] .a-icon-alt');
        if (!ratingEl) ratingEl = el.querySelector('[data-hook="review-star-rating"]');
        if (ratingEl) {
          rating = ratingEl.textContent.trim();
          var m = rating.match(/^\d+/);
          if (m) rating = m[0];
        }

        var author = '';
        var authorEl = el.querySelector('.a-profile-name');
        if (authorEl) author = authorEl.textContent.trim();

        var date = '';
        var dateEl = el.querySelector('[data-hook="review-date"]');
        if (dateEl) date = dateEl.textContent.trim();

        var verified = '';
        var avpEl = el.querySelector('[data-hook="avp-badge"]');
        if (avpEl) verified = avpEl.textContent.trim();

        if (body) {
          reviews.push({
            title: title, body: body, rating: rating,
            author: author, date: date, verified: verified
          });
        }
      }
      var pnEl = document.querySelector('#productTitle');
      var pn = pnEl ? pnEl.textContent.trim() : '';
      return { reviews: reviews, productName: pn || 'Unknown Product', url: url };
    }

    // Generic fallback
    var selectors = ['.review-card', '.review-item', '.review-container', '[class*="review"]',
      '.comment-item', '.comment-card', '.feedback-item', '.rating-item'];
    var seen = {};

    for (var s = 0; s < selectors.length; s++) {
      var els = document.querySelectorAll(selectors[s]);
      for (var j = 0; j < els.length; j++) {
        var el2 = els[j];
        var text = el2.textContent ? el2.textContent.trim() : '';
        if (text.length < 20 || text.length > 5000) continue;
        var key = text.slice(0, 100);
        if (seen[key]) continue;
        seen[key] = true;

        var starEl = el2.querySelector('[class*="star"], [class*="rating"]');
        var rating2 = '';
        if (starEl) {
          var starText = starEl.textContent || '';
          var starMatches = starText.match(/[★⭐]/g);
          rating2 = starMatches ? String(starMatches.length) : '';
        }
        reviews.push({
          title: '', body: text.slice(0, 2000), rating: rating2,
          author: '', date: '', verified: ''
        });
      }
      if (reviews.length > 0) break;
    }

    var seen2 = {};
    var deduped = [];
    for (var k = 0; k < reviews.length; k++) {
      var key2 = reviews[k].body.slice(0, 100);
      if (seen2[key2]) continue;
      seen2[key2] = true;
      deduped.push(reviews[k]);
    }

    var h1 = document.querySelector('h1');
    var pn2 = h1 ? h1.textContent.trim() : '';
    return { reviews: deduped, productName: pn2 || 'Unknown Product', url: url };
  }

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getReviews') {
      sendResponse(scrapeReviews());
    }
    return true;
  });
})();
