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
      zip.file(file.name, file.buffer);
    });

    const zipArrayBuffer = await zip.generateAsync(
      { type: 'arraybuffer' },
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
