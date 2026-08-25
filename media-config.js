window.PCM_MEDIA = (() => {
  const CLOUD_NAME = 'v6hqki7m';
  const UPLOAD_PRESET = 'pcmsomagede_document';
  const FALLBACK_ORIGIN = 'https://www.pcmcepu.com';
  const manifest = window.PCM_MEDIA_MANIFEST || {};

  function cloudinary(publicId, resourceType = 'auto') {
    if (!publicId) return null;
    const encoded = String(publicId).split('/').map(encodeURIComponent).join('/');
    return `https://res.cloudinary.com/${CLOUD_NAME}/${resourceType}/upload/${encoded}`;
  }

  function resolve(key, fallback = null) {
    const item = manifest[key];
    if (!item) return fallback;
    if (item.url) return item.url;
    if (item.publicId) return cloudinary(item.publicId, item.resourceType || 'auto') || fallback;
    return fallback;
  }

  function withFallback(primary, fallback) {
    return primary || fallback || FALLBACK_ORIGIN;
  }

  return Object.freeze({
    cloudName: CLOUD_NAME,
    uploadPreset: UPLOAD_PRESET,
    fallbackOrigin: FALLBACK_ORIGIN,
    cloudinary,
    resolve,
    withFallback
  });
})();
