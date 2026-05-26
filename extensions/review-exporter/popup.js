// ReviewExporter v1.0 - Amazon review scraper + ReviewMiner referral

const REVIEWMINER_URL = 'https://reviewminer.xyz';

let reviews = [];
let productName = '';
let productUrl = '';

const scanBtn = document.getElementById('scanBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const statusEl = document.getElementById('status');
const countBadge = document.getElementById('count');
const preview = document.getElementById('preview');
const productInfo = document.getElementById('productInfo');
const productNameEl = document.getElementById('productName');
const reviewCountEl = document.getElementById('reviewCount');
const exportStatus = document.getElementById('exportStatus');
const reviewminerLink2 = document.getElementById('reviewminerLink2');

reviewminerLink2.href = REVIEWMINER_URL;

async function scanPage() {
  preview.innerHTML = '<div class="preview-empty">Scanning page for reviews...</div>';
  reviews = [];

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showStatus('No active tab found', 'error');
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getReviews' });

    if (!response || !response.reviews) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      const retry = await chrome.tabs.sendMessage(tab.id, { action: 'getReviews' });
      if (retry && retry.reviews) {
        reviews = retry.reviews;
        productName = retry.productName || 'Unknown Product';
        productUrl = retry.url || tab.url;
      }
    } else {
      reviews = response.reviews;
      productName = response.productName || 'Unknown Product';
      productUrl = response.url || tab.url;
    }

    if (reviews.length === 0) {
      preview.innerHTML = '<div class="preview-empty">No reviews found on this page. Try an Amazon product page.</div>';
      countBadge.textContent = '0 reviews found';
      exportCsvBtn.disabled = true;
      analyzeBtn.disabled = true;
      productInfo.classList.add('hidden');
      return;
    }

    countBadge.textContent = `${reviews.length} reviews found`;
    exportCsvBtn.disabled = false;
    analyzeBtn.disabled = false;

    productNameEl.textContent = productName;
    reviewCountEl.textContent = `${reviews.length} reviews`;
    productInfo.classList.remove('hidden');

    renderPreview();
    showStatus(`Found ${reviews.length} reviews`, 'success');
  } catch (err) {
    console.error('ReviewExporter error:', err);
    showStatus('Could not access this page. Try refreshing.', 'error');
    preview.innerHTML = '<div class="preview-empty">Error. Some pages restrict access.</div>';
  }
}

function renderPreview() {
  const show = reviews.slice(0, 8);
  preview.innerHTML = show
    .map(
      (r, i) => `
      <div class="review-item">
        ${r.rating ? `<div class="review-rating">${'★'.repeat(parseInt(r.rating) || 0)}${'☆'.repeat(5 - (parseInt(r.rating) || 0))} ${r.rating}</div>` : ''}
        ${r.title ? `<div class="review-title">${escapeHtml(r.title)}</div>` : ''}
        <div class="review-body">${escapeHtml(r.body.slice(0, 200))}</div>
        <div class="review-meta">${[r.author, r.date, r.verified].filter(Boolean).join(' · ') || 'Review #' + (i + 1)}</div>
      </div>`
    )
    .join('');

  if (reviews.length > 8) {
    preview.innerHTML += `<div class="preview-empty" style="padding:10px">+ ${reviews.length - 8} more reviews in export...</div>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function exportCsv() {
  if (reviews.length === 0) return;

  const headers = ['title', 'body', 'rating', 'author', 'date', 'verified'];
  const escape = (s) => `"${String(s).replace(/"/g, '""').replace(/\n/g, ' ')}"`;

  let csv = headers.join(',') + '\n';
  reviews.forEach((r) => {
    csv += headers.map((h) => escape(r[h] || '')).join(',') + '\n';
  });

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url,
    filename: `reviews_${productName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.csv`,
    saveAs: false,
  });

  showStatus(`Exported ${reviews.length} reviews as CSV`, 'success');
  exportStatus.textContent = `Last export: ${reviews.length} reviews`;
  setTimeout(() => statusEl.classList.add('hidden'), 2000);
}

function openReviewMiner() {
  // Copy reviews to clipboard for easy pasting
  const text = reviews.map((r) => `${r.rating ? '★'.repeat(parseInt(r.rating)||0) + ' ' : ''}${r.title}\n${r.body}`).join('\n\n---\n\n');

  // Open ReviewMiner in a new tab
  chrome.tabs.create({ url: REVIEWMINER_URL + '/dashboard' });

  // Store review data so the user can paste it
  chrome.storage.local.set({
    exportedReviews: text,
    productName,
    productUrl,
    exportTime: Date.now(),
  });

  showStatus('Opening ReviewMiner... Paste your reviews there!', 'info');
}

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');
}

// Event listeners
scanBtn.addEventListener('click', scanPage);
exportCsvBtn.addEventListener('click', exportCsv);
analyzeBtn.addEventListener('click', openReviewMiner);

// Auto-scan on open
scanPage();
