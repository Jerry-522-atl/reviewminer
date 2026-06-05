var REVIEWMINER_URL = 'https://reviewminer.xyz';
var reviews = [];
var productName = '';
var productUrl = '';

var scanBtn = document.getElementById('scanBtn');
var exportCsvBtn = document.getElementById('exportCsvBtn');
var sendBtn = document.getElementById('sendBtn');
var analyzeBtn = document.getElementById('analyzeBtn');
var statusEl = document.getElementById('status');
var countBadge = document.getElementById('count');
var previewEl = document.getElementById('preview');
var productInfo = document.getElementById('productInfo');
var productNameEl = document.getElementById('productName');
var reviewCountEl = document.getElementById('reviewCount');
var exportStatus = document.getElementById('exportStatus');

document.getElementById('reviewminerLink').onclick = function(e) {
  e.preventDefault();
  chrome.tabs.create({ url: REVIEWMINER_URL });
};

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = 'status ' + type;
  statusEl.classList.remove('hidden');
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderPreview() {
  var show = reviews.slice(0, 8);
  var html = '';
  for (var i = 0; i < show.length; i++) {
    var r = show[i];
    var stars = r.rating ? parseInt(r.rating) : 0;
    var starStr = '';
    for (var s = 0; s < 5; s++) starStr += s < stars ? '★' : '☆';
    html += '<div class="review-item">' +
      (r.rating ? '<div class="review-rating">' + starStr + ' ' + r.rating + '/5</div>' : '') +
      (r.title ? '<div class="review-title">' + escapeHtml(r.title) + '</div>' : '') +
      '<div class="review-body">' + escapeHtml(r.body.slice(0, 200)) + '</div>' +
      '<div class="review-meta">' + [r.author, r.date, r.verified].filter(function(x){return x;}).join(' | ') + '</div></div>';
  }
  previewEl.innerHTML = html;
  if (reviews.length > 8) {
    previewEl.innerHTML += '<div class="preview-empty">+ ' + (reviews.length - 8) + ' more in export...</div>';
  }
}

function scanPage() {
  previewEl.innerHTML = '<div class="preview-empty">Scanning page for reviews...</div>';
  reviews = [];
  showStatus('Scanning...', 'info');

  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || !tabs[0]) {
      showStatus('No active tab found', 'error');
      return;
    }
    var tabId = tabs[0].id;

    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: function() {
        var reviews = [];
        var url = location.href;

        // Amazon-specific selectors
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
              // Extract just the number, e.g. "5 星（最高 5 星）" -> "5"
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
                title: title,
                body: body,
                rating: rating,
                author: author,
                date: date,
                verified: verified
              });
            }
          }

          var productName = '';
          var pnEl = document.querySelector('#productTitle');
          if (pnEl) productName = pnEl.textContent.trim();
          if (!productName) {
            var h1 = document.querySelector('h1');
            if (h1) productName = h1.textContent.trim();
          }
          return { reviews: reviews, productName: productName || 'Unknown Product', url: url };
        }

        // Generic review selectors for other sites
        var selectors = ['.review-card', '.review-item', '.review-container', '[class*="review"]',
          '.comment-item', '.comment-card', '.feedback-item', '.rating-item',
          '[data-testid="review"]', '[data-automation="review"]'];
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

            var starEl = el2.querySelector('[class*="star"], [class*="rating"], [aria-label*="star"]');
            var rating2 = '';
            if (starEl) {
              var starText = starEl.textContent || '';
              var starMatches = starText.match(/[★⭐]/g);
              rating2 = starMatches ? String(starMatches.length) : '';
            }

            reviews.push({
              title: '',
              body: text.slice(0, 2000),
              rating: rating2,
              author: '',
              date: '',
              verified: ''
            });
          }
          if (reviews.length > 0) break;
        }

        // Deduplicate
        var seen2 = {};
        var deduped = [];
        for (var k = 0; k < reviews.length; k++) {
          var key2 = reviews[k].body.slice(0, 100);
          if (seen2[key2]) continue;
          seen2[key2] = true;
          deduped.push(reviews[k]);
        }

        var pn = '';
        var h1el = document.querySelector('h1');
        if (h1el) pn = h1el.textContent.trim();
        return { reviews: deduped, productName: pn || 'Unknown Product', url: url };
      }
    }, function(result) {
      if (chrome.runtime.lastError) {
        showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        previewEl.innerHTML = '<div class="preview-empty">Scan failed. Make sure you are on a product page.</div>';
        return;
      }

      var data = (result && result[0] && result[0].result) ? result[0].result : { reviews: [], productName: '', url: '' };
      reviews = data.reviews || [];
      productName = data.productName || 'Unknown Product';
      productUrl = data.url || '';

      countBadge.textContent = reviews.length + ' reviews found';

      if (reviews.length === 0) {
        previewEl.innerHTML = '<div class="preview-empty">No reviews found. Try an Amazon product page with reviews visible.</div>';
        exportCsvBtn.disabled = true;
        analyzeBtn.disabled = true;
        productInfo.classList.add('hidden');
        showStatus('No reviews found', 'error');
        return;
      }

      exportCsvBtn.disabled = false;
      sendBtn.disabled = false;
      analyzeBtn.disabled = false;
      productNameEl.textContent = productName;
      reviewCountEl.textContent = reviews.length + ' reviews';
      productInfo.classList.remove('hidden');
      renderPreview();
      showStatus('Found ' + reviews.length + ' reviews', 'success');
    });
  });
}

function exportCsv() {
  if (reviews.length === 0) return;
  var headers = ['title', 'body', 'rating', 'author', 'date', 'verified'];
  var csv = headers.join(',') + '\n';
  for (var i = 0; i < reviews.length; i++) {
    var row = [];
    for (var h = 0; h < headers.length; h++) {
      row.push('"' + String(reviews[i][headers[h]] || '').replace(/"/g, '""').replace(/\n/g, ' ') + '"');
    }
    csv += row.join(',') + '\n';
  }
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url: url,
    filename: 'reviewminer/reviews_' + Date.now() + '.csv',
    saveAs: false
  });
  showStatus('Exported ' + reviews.length + ' reviews as CSV', 'success');
  exportStatus.textContent = 'Last: ' + reviews.length + ' reviews';
  setTimeout(function() { statusEl.classList.add('hidden'); }, 2000);
}

function sendToReviewMiner() {
  if (reviews.length === 0) {
    showStatus('No reviews to send', 'error');
    return;
  }

  showStatus('Sending ' + reviews.length + ' reviews to ReviewMiner...', 'info');
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';

  // Build payload matching the extension's review structure
  var payload = {
    reviews: reviews,
    productName: productName,
    productUrl: productUrl
  };

  fetch(REVIEWMINER_URL + '/api/receive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.error) {
        showStatus('Error: ' + data.error, 'error');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send & Analyze on ReviewMiner';
        return;
      }

      showStatus('Analysis complete! Opening report...', 'success');

      if (data.url) {
        chrome.tabs.create({ url: REVIEWMINER_URL + data.url });
      }

      chrome.storage.local.set({ exportedAt: Date.now(), count: reviews.length });
      sendBtn.textContent = 'Sent!';
      setTimeout(function() {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send & Analyze on ReviewMiner';
      }, 3000);
    })
    .catch(function(err) {
      showStatus('Network error - opening dashboard instead', 'error');
      chrome.tabs.create({ url: REVIEWMINER_URL + '/dashboard' });
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send & Analyze on ReviewMiner';
    });
}

function openReviewMiner() {
  chrome.tabs.create({ url: REVIEWMINER_URL + '/dashboard' });
  chrome.storage.local.set({ exportedAt: Date.now(), count: reviews.length });
  showStatus('Opening ReviewMiner dashboard', 'info');
}

scanBtn.onclick = scanPage;
exportCsvBtn.onclick = exportCsv;
sendBtn.onclick = sendToReviewMiner;
analyzeBtn.onclick = openReviewMiner;

// Auto-scan on open
scanPage();
