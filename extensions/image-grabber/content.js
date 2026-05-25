// Content script: injected into every page
// Collects all images with metadata

(() => {
  function collectImages() {
    const images = [];
    const seen = new Set();

    // Process <img> tags
    document.querySelectorAll('img').forEach((img) => {
      const src = img.src || img.getAttribute('data-src');
      if (!src || seen.has(src)) return;
      if (src.startsWith('data:')) return; // skip inline data URIs
      seen.add(src);

      images.push({
        src,
        alt: img.alt || '',
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0,
        type: 'img',
      });
    });

    // Process <picture> / <source> elements
    document.querySelectorAll('source[srcset]').forEach((source) => {
      const srcset = source.getAttribute('srcset');
      if (!srcset) return;
      const first = srcset.split(',')[0].trim().split(' ')[0];
      if (!first || seen.has(first)) return;
      if (first.startsWith('data:')) return;
      seen.add(first);
      images.push({ src: first, alt: '', width: 0, height: 0, type: 'source' });
    });

    // Process background images
    document.querySelectorAll('*').forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === 'none') return;
      const match = bg.match(/url\(["']?([^"')]+)["']?\)/g);
      if (!match) return;
      match.forEach((m) => {
        const url = m.replace(/url\(["']?/, '').replace(/["']?\)/, '');
        if (!url || seen.has(url) || url.startsWith('data:')) return;
        seen.add(url);
        images.push({ src: url, alt: 'Background Image', width: 0, height: 0, type: 'bg' });
      });
    });

    // Process SVG <image> elements
    document.querySelectorAll('image[href]').forEach((img) => {
      const href = img.getAttribute('href');
      if (!href || seen.has(href) || href.startsWith('data:')) return;
      seen.add(href);
      images.push({ src: href, alt: '', width: 0, height: 0, type: 'svg' });
    });

    return images;
  }

  // Listen for requests from the popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getImages') {
      sendResponse({ images: collectImages() });
    }
    return true; // keep channel open for async response
  });
})();
