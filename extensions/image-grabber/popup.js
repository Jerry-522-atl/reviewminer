// Popup logic for ImageGrab

let allImages = [];
let selectedImages = new Set();

const imageList = document.getElementById('imageList');
const countBadge = document.getElementById('count');
const refreshBtn = document.getElementById('refreshBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const minSizeSelect = document.getElementById('minSize');
const formatSelect = document.getElementById('format');
const statusEl = document.getElementById('status');
const selectedCount = document.getElementById('selectedCount');

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
      imageList.innerHTML = '<div class="loading">No active tab. Please refresh the page and try again.</div>';
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getImages' });

    if (!response || !response.images) {
      // Content script might not be ready, inject it
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

// Get image format from URL
function getFormat(src) {
  const url = src.split('?')[0].toLowerCase();
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'jpg';
  if (url.endsWith('.png')) return 'png';
  if (url.endsWith('.webp')) return 'webp';
  if (url.endsWith('.svg')) return 'svg';
  if (url.endsWith('.gif')) return 'gif';
  if (url.endsWith('.bmp')) return 'bmp';
  if (url.endsWith('.ico')) return 'ico';
  return 'other';
}

// Filter and render images
function renderImages() {
  const minSize = parseInt(minSizeSelect.value);
  const format = formatSelect.value;

  const filtered = allImages.filter((img) => {
    if (minSize > 0) {
      const maxDim = Math.max(img.width || 0, img.height || 0);
      if (maxDim < minSize) return false;
    }
    if (format !== 'all') {
      if (getFormat(img.src) !== format) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    imageList.innerHTML = '<div class="loading">No images match your filters. Try adjusting the size or format.</div>';
    countBadge.textContent = '0 images';
    return;
  }

  countBadge.textContent = `${filtered.length} images`;
  imageList.innerHTML = filtered
    .map(
      (img, i) => `
      <div class="image-card ${selectedImages.has(img.src) ? 'selected' : ''}" data-src="${encodeURIComponent(img.src)}">
        <img src="${img.src}" alt="${img.alt || 'Image'}" loading="lazy" onerror="this.parentElement.style.display='none'">
        <div class="overlay">
          <span class="size">${img.width}x${img.height || '?'}</span>
          <button class="download-btn" data-src="${encodeURIComponent(img.src)}">↓</button>
        </div>
      </div>`
    )
    .join('');

  // Add click listeners
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
      downloadImage(src);
    });
  });
}

function toggleSelect(src, card) {
  if (selectedImages.has(src)) {
    selectedImages.delete(src);
    card.classList.remove('selected');
  } else {
    selectedImages.add(src);
    card.classList.add('selected');
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  if (selectedImages.size > 0) {
    selectedCount.textContent = `${selectedImages.size} selected`;
    selectedCount.classList.remove('hidden');
    downloadAllBtn.textContent = `📥 Download Selected (${selectedImages.size})`;
  } else {
    selectedCount.classList.add('hidden');
    downloadAllBtn.textContent = '📥 Download All Filtered';
  }
}

function updateCount() {
  countBadge.textContent = `${allImages.length} images total`;
}

// Download a single image
function downloadImage(src) {
  const filename = src.split('/').pop()?.split('?')[0] || 'image';
  chrome.downloads.download({
    url: src,
    filename: `imagegrab/${filename}`,
    saveAs: false,
  });
  showStatus('Downloading...', 'success');
  setTimeout(() => statusEl.classList.add('hidden'), 1500);
}

// Download all filtered images
async function downloadAll() {
  const minSize = parseInt(minSizeSelect.value);
  const format = formatSelect.value;

  const toDownload = allImages.filter((img) => {
    if (selectedImages.size > 0) return selectedImages.has(img.src);
    if (minSize > 0) {
      const maxDim = Math.max(img.width || 0, img.height || 0);
      if (maxDim < minSize) return false;
    }
    if (format !== 'all') {
      if (getFormat(img.src) !== format) return false;
    }
    return true;
  });

  if (toDownload.length === 0) {
    showStatus('No images to download', 'error');
    return;
  }

  showStatus(`Downloading ${toDownload.length} images...`, 'success');

  for (let i = 0; i < toDownload.length; i++) {
    const src = toDownload[i].src;
    const ext = src.split('.').pop()?.split('?')[0] || 'jpg';
    const filename = `imagegrab/img_${String(i + 1).padStart(3, '0')}.${ext}`;

    chrome.downloads.download({
      url: src,
      filename,
      saveAs: false,
    });

    // Small delay to avoid overwhelming the download queue
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

// Load on open
loadImages();
