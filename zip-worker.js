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

self.importScripts('libs/zip-runtime.js');

self.onmessage = async (event) => {
  const { jobId, type, files = [] } = event.data || {};
  if (type !== 'CREATE_ZIP') return;

  try {
    if (!self.SidekickZip?.createZip) {
      throw new Error('zip runtime failed to load in zip worker.');
    }

    const normalizedFiles = files.map(file => {
      const options = getCompressionOptions(file.name);
      return {
        name: file.name,
        buffer: file.buffer,
        compression: options.compression === 'STORE' ? 0 : 8,
        lastModDate: file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString()
      };
    });

    const zipArrayBuffer = await self.SidekickZip.createZip(normalizedFiles, {
      onProgress: (metadata) => {
        self.postMessage({
          type: 'ZIP_PROGRESS',
          jobId,
          percent: metadata?.percent ?? 0,
          currentFile: metadata?.currentFile || ''
        });
      }
    });

    self.postMessage({ type: 'ZIP_RESULT', jobId, zipArrayBuffer }, [zipArrayBuffer]);
  } catch (error) {
    self.postMessage({
      type: 'ZIP_ERROR',
      jobId,
      message: error?.message || 'Failed to create zip.'
    });
  }
};
