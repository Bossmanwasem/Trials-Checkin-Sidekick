const FAST_STORE_EXTENSIONS = new Set([
  'zip', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif',
  'mp3', 'mp4', 'm4a', 'mov', 'avi', 'mkv', 'pdf', '7z', 'rar'
]);

function getCompressionOptions(name = '') {
  const extension = name.includes('.')
    ? name.split('.').pop().toLowerCase()
    : '';

  if (FAST_STORE_EXTENSIONS.has(extension)) {
    return {
      compression: 'STORE'
    };
  }

  return {
    compression: 'DEFLATE',
    compressionOptions: { level: 1 }
  };
}

self.importScripts('libs/jszip.min.js');

self.onmessage = async (event) => {
  const { jobId, type, files = [] } = event.data || {};
  if (type !== 'CREATE_ZIP') return;

  try {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip failed to load in zip worker.');
    }

    const zip = new JSZip();
    files.forEach(file => {
      zip.file(file.name, file.buffer, getCompressionOptions(file.name));
    });

    const zipArrayBuffer = await zip.generateAsync(
      {
        type: 'arraybuffer',
        streamFiles: true,
        compression: 'DEFLATE',
        compressionOptions: { level: 1 }
      },
      (metadata) => {
        self.postMessage({
          type: 'ZIP_PROGRESS',
          jobId,
          percent: metadata?.percent ?? 0,
          currentFile: metadata?.currentFile || ''
        });
      }
    );

    self.postMessage({ type: 'ZIP_RESULT', jobId, zipArrayBuffer }, [zipArrayBuffer]);
  } catch (error) {
    self.postMessage({
      type: 'ZIP_ERROR',
      jobId,
      message: error?.message || 'Failed to create zip.'
    });
  }
};
