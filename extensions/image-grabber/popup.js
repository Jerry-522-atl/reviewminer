// ImageGrab v1.2 - PRO via ReviewMiner subscription
const FREE_LIMIT = 5;
const REVIEWMINER_URL = 'https://reviewminer.xyz';

let allImages = [];
let selectedImages = new Set();
let isPro = false;

const imageList = document.getElementById('imageList');
const countBadge = document.getElementById('count');
const refreshBtn = document.getElementById('refreshBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const minSizeSelect = document.getElementById('minSize');
const formatSelect = document.getElementById('format');
const statusEl = document.getElementById('status');
const selectedCount = document.getElementById('selectedCount');
const limitWarning = document.getElementById('limitWarning');
const upsell = document.getElementById('upsell');
const proBadge = document.getElementById('proBadge');
const upgradeLink = document.getElementById('upgradeLink');
const getProBtn = document.getElementById('getProBtn');
const activateBtn = document.getElementById('activateBtn');
const licenseInput = document.getElementById('licenseInput');
const reviewminerLink = document.getElementById('reviewminerLink');

// Init
chrome.storage.local.get(['proStatus', 'licenseKey'], (result) => {
  if (result.proStatus === true && result.licenseKey) {
    // Verify the stored license is still valid
    verifyLicense(result.licenseKey);
  }
});
reviewminerLink.href = REVIEWMINER_URL;

function updateProUI() {
  if (isPro) {
    proBadge.classList.remove('hidden');
    limitWarning.classList.add('hidden');
    upsell.classList.add('hidden');
  } else {
    proBadge.classList.add('hidden');
    // Don't auto-hide limitWarning/upsell here — they appear contextually
  }
}

async function verifyLicense(key) {
  try {
    const res = await fetch(`${REVIEWMINER_URL}/api/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: key }),
    });
    const data = await res.json();
    if (res.ok && data.valid) {
      isPro = true;
      chrome.storage.local.set({ proStatus: true, licenseKey: key });
      updateProUI();
      renderImages();
      return true;
    } else {
      // License invalid/expired — clear stored PRO status
      isPro = false;
      chrome.storage.local.remove(['proStatus', 'licenseKey']);
      updateProUI();
      return false;
    }
  } catch {
    // Offline — trust cached status
    return isPro;
  }
}

// Load images from active tab
async function loadImages() {
  imageList.innerHTML = '<div class="loading">Scanning page for images...</div>';
  allImages = [];
  selectedImages.clear();
  updateSelectionUI();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showStatus('No active tab found', 'error');
      imageList.innerHTML = '<div class="loading">No active tab. Refresh the page and try again.</div>';
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getImages' });

    if (!response || !response.images) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      const retry = await chrome.tabs.sendMessage(tab.id, { action: 'getImages' });
      if (retry && retry.images) {
        allImages = retry.images;
      } else {
        allImages = [];
      }
    } else {
      allImages = response.images;
    }

    renderImages();
    updateCount();
  } catch (err) {
    console.error('ImageGrab error:', err);
    showStatus('Could not access this page. Try refreshing.', 'error');
    imageList.innerHTML = '<div class="loading">Error loading images. Some pages restrict access.</div>';
  }
}

function getFormat(src) {
  const url = src.split('?')[0].toLowerCase();
  if (url.includes('.jpg') || url.includes('.jpeg')) return 'jpg';
  if (url.includes('.png')) return 'png';
  if (url.includes('.webp')) return 'webp';
  if (url.includes('.svg')) return 'svg';
  if (url.includes('.gif')) return 'gif';
  if (url.includes('.bmp')) return 'bmp';
  if (url.includes('.ico')) return 'ico';
  return 'other';
}

function getFiltered() {
  const minSize = parseInt(minSizeSelect.value);
  const format = formatSelect.value;

  return allImages.filter((img) => {
    if (minSize > 0) {
      const maxDim = Math.max(img.width || 0, img.height || 0);
      if (maxDim < minSize) return false;
    }
    if (format !== 'all') {
      if (getFormat(img.src) !== format) return false;
    }
    return true;
  });
}

function renderImages() {
  const filtered = getFiltered();

  if (filtered.length === 0) {
    imageList.innerHTML = '<div class="loading">No images match filters. Try adjusting size or format.</div>';
    countBadge.textContent = '0 images';
    return;
  }

  countBadge.textContent = `${filtered.length} images`;
  imageList.innerHTML = filtered
    .map(
      (img) => `
      <div class="image-card ${selectedImages.has(img.src) ? 'selected' : ''}" data-src="${encodeURIComponent(img.src)}">
        <img src="${img.src}" alt="${img.alt || 'Image'}" loading="lazy" onerror="this.parentElement.style.display='none'">
        <div class="overlay">
          <span class="size">${img.width || '?'}x${img.height || '?'}</span>
          <button class="download-btn" data-src="${encodeURIComponent(img.src)}">&#8595;</button>
        </div>
      </div>`
    )
    .join('');

  imageList.querySelectorAll('.image-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('download-btn')) return;
      const src = decodeURIComponent(card.dataset.src);
      toggleSelect(src, card);
    });
  });

  imageList.querySelectorAll('.download-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const src = decodeURIComponent(btn.dataset.src);
      downloadSingle(src);
    });
  });
}

function toggleSelect(src, card) {
  if (selectedImages.has(src)) {
    selectedImages.delete(src);
    card.classList.remove('selected');
  } else {
    if (!isPro && selectedImages.size >= FREE_LIMIT) {
      showUpsell();
      return;
    }
    selectedImages.add(src);
    card.classList.add('selected');
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  if (selectedImages.size > 0) {
    selectedCount.textContent = `${selectedImages.size} selected`;
    selectedCount.classList.remove('hidden');
    downloadAllBtn.textContent = `Download Selected (${selectedImages.size})`;
  } else {
    selectedCount.classList.add('hidden');
    downloadAllBtn.textContent = 'Download All Filtered';
  }
}

function updateCount() {
  countBadge.textContent = `${allImages.length} images total`;
}

function showUpsell() {
  upsell.classList.remove('hidden');
  showStatus('Free limit: select up to 5 images', 'error');
}

function downloadSingle(src) {
  const filename = src.split('/').pop()?.split('?')[0] || 'image';
  chrome.downloads.download({
    url: src,
    filename: `imagegrab/${filename}`,
    saveAs: false,
  });
  showStatus('Downloading...', 'success');
  setTimeout(() => statusEl.classList.add('hidden'), 1500);
}

async function downloadAll() {
  const filtered = getFiltered();
  const toDownload = selectedImages.size > 0
    ? filtered.filter((img) => selectedImages.has(img.src))
    : filtered;

  if (toDownload.length === 0) {
    showStatus('No images to download', 'error');
    return;
  }

  if (!isPro && toDownload.length > FREE_LIMIT) {
    showUpsell();
    limitWarning.classList.remove('hidden');
    return;
  }

  showStatus(`Downloading ${toDownload.length} images...`, 'success');

  for (let i = 0; i < toDownload.length; i++) {
    const src = toDownload[i].src;
    const ext = getFormat(src);
    const filename = `imagegrab/img_${String(i + 1).padStart(3, '0')}.${ext}`;

    chrome.downloads.download({
      url: src,
      filename,
      saveAs: false,
    });

    if (i < toDownload.length - 1) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  setTimeout(() => statusEl.classList.add('hidden'), 3000);
}

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');
}

// Event listeners
refreshBtn.addEventListener('click', loadImages);
downloadAllBtn.addEventListener('click', downloadAll);
minSizeSelect.addEventListener('change', renderImages);
formatSelect.addEventListener('change', renderImages);

upgradeLink.addEventListener('click', (e) => {
  e.preventDefault();
  showUpsell();
});

// "Get Unlimited Access" → opens ReviewMiner pricing
getProBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${REVIEWMINER_URL}/#pricing` });
});

// Activate license key
activateBtn.addEventListener('click', async () => {
  const key = licenseInput.value.trim();
  if (!key) {
    showStatus('Enter your license key from ReviewMiner dashboard', 'error');
    return;
  }

  activateBtn.disabled = true;
  activateBtn.textContent = '...';

  const ok = await verifyLicense(key);
  if (ok) {
    showStatus('PRO activated! Unlimited downloads unlocked.', 'success');
    renderImages();
  } else {
    showStatus('Invalid or expired license key. Check your ReviewMiner dashboard.', 'error');
  }

  activateBtn.disabled = false;
  activateBtn.textContent = 'Activate';
});

// Enter key on Enter press
licenseInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') activateBtn.click();
});

// Load on open
loadImages();
