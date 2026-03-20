(function(global) {
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let j = 0; j < 8; j += 1) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i += 1) {
      crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function concatUint8Arrays(chunks) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    chunks.forEach(chunk => {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    return result;
  }

  async function readStream(stream) {
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      chunks.push(chunk);
      total += chunk.length;
    }
    const result = new Uint8Array(total);
    let offset = 0;
    chunks.forEach(chunk => {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    return result;
  }

  async function deflateRaw(data) {
    if (typeof CompressionStream !== 'function') {
      throw new Error('CompressionStream is not available in this browser.');
    }
    const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return readStream(stream);
  }

  async function inflateRaw(data) {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('DecompressionStream is not available in this browser.');
    }
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return readStream(stream);
  }

  function dateToDos(date = new Date()) {
    const year = Math.max(1980, date.getUTCFullYear());
    const dosTime = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2);
    const dosDate = ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
    return { dosTime, dosDate };
  }

  function writeUint16(view, offset, value) { view.setUint16(offset, value, true); }
  function writeUint32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }
  function writeBigUint64(view, offset, value) { view.setBigUint64(offset, BigInt(value), true); }
  function getUint16(view, offset) { return view.getUint16(offset, true); }
  function getUint32(view, offset) { return view.getUint32(offset, true); }
  function getBigUint64(view, offset) { return view.getBigUint64(offset, true); }

  function encodePath(path) {
    return textEncoder.encode(path.replace(/\\/g, '/'));
  }

  function makeLocalHeader(entry) {
    const nameBytes = entry.nameBytes;
    const useZip64 = entry.useZip64;
    const extraLength = useZip64 ? 20 : 0;
    const header = new Uint8Array(30 + nameBytes.length + extraLength);
    const view = new DataView(header.buffer);
    const { dosTime, dosDate } = dateToDos(entry.lastModDate);
    writeUint32(view, 0, 0x04034b50);
    writeUint16(view, 4, useZip64 ? 45 : 20);
    writeUint16(view, 6, 0x0808);
    writeUint16(view, 8, entry.method);
    writeUint16(view, 10, dosTime);
    writeUint16(view, 12, dosDate);
    writeUint32(view, 14, entry.crc32);
    writeUint32(view, 18, useZip64 ? 0xFFFFFFFF : entry.compressedSize);
    writeUint32(view, 22, useZip64 ? 0xFFFFFFFF : entry.uncompressedSize);
    writeUint16(view, 26, nameBytes.length);
    writeUint16(view, 28, extraLength);
    header.set(nameBytes, 30);
    if (useZip64) {
      const extraOffset = 30 + nameBytes.length;
      writeUint16(view, extraOffset, 0x0001);
      writeUint16(view, extraOffset + 2, 16);
      writeBigUint64(view, extraOffset + 4, entry.uncompressedSize);
      writeBigUint64(view, extraOffset + 12, entry.compressedSize);
    }
    return header;
  }

  function makeCentralDirectoryHeader(entry) {
    const nameBytes = entry.nameBytes;
    const zip64Fields = [];
    if (entry.useZip64) {
      zip64Fields.push(entry.uncompressedSize, entry.compressedSize, entry.localHeaderOffset);
    }
    const extraLength = entry.useZip64 ? 4 + zip64Fields.length * 8 : 0;
    const record = new Uint8Array(46 + nameBytes.length + extraLength);
    const view = new DataView(record.buffer);
    const { dosTime, dosDate } = dateToDos(entry.lastModDate);
    writeUint32(view, 0, 0x02014b50);
    writeUint16(view, 4, 45);
    writeUint16(view, 6, entry.useZip64 ? 45 : 20);
    writeUint16(view, 8, 0x0808);
    writeUint16(view, 10, entry.method);
    writeUint16(view, 12, dosTime);
    writeUint16(view, 14, dosDate);
    writeUint32(view, 16, entry.crc32);
    writeUint32(view, 20, entry.useZip64 ? 0xFFFFFFFF : entry.compressedSize);
    writeUint32(view, 24, entry.useZip64 ? 0xFFFFFFFF : entry.uncompressedSize);
    writeUint16(view, 28, nameBytes.length);
    writeUint16(view, 30, extraLength);
    writeUint16(view, 32, 0);
    writeUint16(view, 34, 0);
    writeUint16(view, 36, 0);
    writeUint32(view, 38, 0);
    writeUint32(view, 42, entry.useZip64 ? 0xFFFFFFFF : entry.localHeaderOffset);
    record.set(nameBytes, 46);
    if (entry.useZip64) {
      const extraOffset = 46 + nameBytes.length;
      writeUint16(view, extraOffset, 0x0001);
      writeUint16(view, extraOffset + 2, zip64Fields.length * 8);
      let cursor = extraOffset + 4;
      zip64Fields.forEach(field => {
        writeBigUint64(view, cursor, field);
        cursor += 8;
      });
    }
    return record;
  }

  function makeEndOfCentralDirectory(entriesCount, centralDirectorySize, centralDirectoryOffset, needsZip64) {
    const chunks = [];
    if (needsZip64) {
      const zip64Eocd = new Uint8Array(56);
      const zip64View = new DataView(zip64Eocd.buffer);
      writeUint32(zip64View, 0, 0x06064b50);
      writeBigUint64(zip64View, 4, 44);
      writeUint16(zip64View, 12, 45);
      writeUint16(zip64View, 14, 45);
      writeUint32(zip64View, 16, 0);
      writeUint32(zip64View, 20, 0);
      writeBigUint64(zip64View, 24, entriesCount);
      writeBigUint64(zip64View, 32, entriesCount);
      writeBigUint64(zip64View, 40, centralDirectorySize);
      writeBigUint64(zip64View, 48, centralDirectoryOffset);
      chunks.push(zip64Eocd);

      const locator = new Uint8Array(20);
      const locatorView = new DataView(locator.buffer);
      writeUint32(locatorView, 0, 0x07064b50);
      writeUint32(locatorView, 4, 0);
      writeBigUint64(locatorView, 8, centralDirectoryOffset + centralDirectorySize);
      writeUint32(locatorView, 16, 1);
      chunks.push(locator);
    }

    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    writeUint32(eocdView, 0, 0x06054b50);
    writeUint16(eocdView, 4, 0);
    writeUint16(eocdView, 6, 0);
    writeUint16(eocdView, 8, needsZip64 ? 0xFFFF : entriesCount);
    writeUint16(eocdView, 10, needsZip64 ? 0xFFFF : entriesCount);
    writeUint32(eocdView, 12, needsZip64 ? 0xFFFFFFFF : centralDirectorySize);
    writeUint32(eocdView, 16, needsZip64 ? 0xFFFFFFFF : centralDirectoryOffset);
    writeUint16(eocdView, 20, 0);
    chunks.push(eocd);
    return chunks;
  }

  async function createZip(files, { onProgress } = {}) {
    const archiveChunks = [];
    const centralDirectory = [];
    let offset = 0;
    let completed = 0;

    for (const file of files) {
      const source = file.buffer instanceof Uint8Array ? file.buffer : new Uint8Array(file.buffer);
      const useStore = file.compression === 0;
      const compressedData = useStore ? source : await deflateRaw(source);
      const entry = {
        name: file.name,
        nameBytes: encodePath(file.name),
        crc32: crc32(source),
        compressedSize: compressedData.length,
        uncompressedSize: source.length,
        localHeaderOffset: offset,
        lastModDate: file.lastModDate ? new Date(file.lastModDate) : new Date(),
        method: useStore ? 0 : 8
      };
      entry.useZip64 = entry.compressedSize >= 0xFFFFFFFF || entry.uncompressedSize >= 0xFFFFFFFF || entry.localHeaderOffset >= 0xFFFFFFFF;
      const localHeader = makeLocalHeader(entry);
      archiveChunks.push(localHeader, compressedData);
      offset += localHeader.length + compressedData.length;
      centralDirectory.push(makeCentralDirectoryHeader(entry));
      completed += 1;
      if (typeof onProgress === 'function') {
        onProgress({
          percent: (completed / files.length) * 100,
          currentFile: file.name
        });
      }
    }

    const centralDirectoryOffset = offset;
    const centralDirectoryBytes = concatUint8Arrays(centralDirectory);
    archiveChunks.push(centralDirectoryBytes);
    offset += centralDirectoryBytes.length;
    const needsZip64 = files.length >= 0xFFFF || centralDirectoryOffset >= 0xFFFFFFFF || centralDirectoryBytes.length >= 0xFFFFFFFF || archiveChunks.some(chunk => chunk.length >= 0xFFFFFFFF);
    const eocdChunks = makeEndOfCentralDirectory(files.length, centralDirectoryBytes.length, centralDirectoryOffset, needsZip64);
    archiveChunks.push(...eocdChunks);
    return concatUint8Arrays(archiveChunks).buffer;
  }

  function findEndOfCentralDirectory(bytes) {
    const minOffset = Math.max(0, bytes.length - 0xFFFF - 22);
    for (let i = bytes.length - 22; i >= minOffset; i -= 1) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
        return i;
      }
    }
    throw new Error('End of central directory not found.');
  }

  function parseZip64Extra(extraBytes) {
    let offset = 0;
    const info = {};
    const view = new DataView(extraBytes.buffer, extraBytes.byteOffset, extraBytes.byteLength);
    while (offset + 4 <= extraBytes.length) {
      const headerId = getUint16(view, offset);
      const size = getUint16(view, offset + 2);
      const start = offset + 4;
      const end = start + size;
      if (headerId === 0x0001) {
        info.data = extraBytes.subarray(start, end);
        return info;
      }
      offset = end;
    }
    return info;
  }

  function parseCentralDirectory(bytes) {
    const eocdOffset = findEndOfCentralDirectory(bytes);
    const eocdView = new DataView(bytes.buffer, bytes.byteOffset + eocdOffset, bytes.length - eocdOffset);
    let totalEntries = getUint16(eocdView, 10);
    let centralDirectorySize = getUint32(eocdView, 12);
    let centralDirectoryOffset = getUint32(eocdView, 16);

    if (totalEntries === 0xFFFF || centralDirectorySize === 0xFFFFFFFF || centralDirectoryOffset === 0xFFFFFFFF) {
      const locatorOffset = eocdOffset - 20;
      const locatorView = new DataView(bytes.buffer, bytes.byteOffset + locatorOffset, 20);
      if (getUint32(locatorView, 0) !== 0x07064b50) {
        throw new Error('ZIP64 locator not found.');
      }
      const zip64EocdOffset = Number(getBigUint64(locatorView, 8));
      const zip64View = new DataView(bytes.buffer, bytes.byteOffset + zip64EocdOffset, 56);
      totalEntries = Number(getBigUint64(zip64View, 32));
      centralDirectorySize = Number(getBigUint64(zip64View, 40));
      centralDirectoryOffset = Number(getBigUint64(zip64View, 48));
    }

    const entries = [];
    let offset = centralDirectoryOffset;
    for (let index = 0; index < totalEntries; index += 1) {
      const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.length - offset);
      if (getUint32(view, 0) !== 0x02014b50) {
        throw new Error('Invalid central directory record.');
      }
      const method = getUint16(view, 10);
      const compressedSize32 = getUint32(view, 20);
      const uncompressedSize32 = getUint32(view, 24);
      const fileNameLength = getUint16(view, 28);
      const extraFieldLength = getUint16(view, 30);
      const commentLength = getUint16(view, 32);
      const localHeaderOffset32 = getUint32(view, 42);
      const fileNameStart = offset + 46;
      const extraStart = fileNameStart + fileNameLength;
      const commentStart = extraStart + extraFieldLength;
      const name = textDecoder.decode(bytes.subarray(fileNameStart, fileNameStart + fileNameLength));
      const extra = bytes.subarray(extraStart, extraStart + extraFieldLength);
      let compressedSize = compressedSize32;
      let uncompressedSize = uncompressedSize32;
      let localHeaderOffset = localHeaderOffset32;
      if (compressedSize32 === 0xFFFFFFFF || uncompressedSize32 === 0xFFFFFFFF || localHeaderOffset32 === 0xFFFFFFFF) {
        const zip64 = parseZip64Extra(extra).data;
        if (!zip64) throw new Error('Missing ZIP64 extra field.');
        const zip64View = new DataView(zip64.buffer, zip64.byteOffset, zip64.byteLength);
        let cursor = 0;
        if (uncompressedSize32 === 0xFFFFFFFF) {
          uncompressedSize = Number(getBigUint64(zip64View, cursor));
          cursor += 8;
        }
        if (compressedSize32 === 0xFFFFFFFF) {
          compressedSize = Number(getBigUint64(zip64View, cursor));
          cursor += 8;
        }
        if (localHeaderOffset32 === 0xFFFFFFFF) {
          localHeaderOffset = Number(getBigUint64(zip64View, cursor));
        }
      }
      entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset });
      offset = commentStart + commentLength;
    }
    return entries;
  }

  async function extractEntry(bytes, entry) {
    const localView = new DataView(bytes.buffer, bytes.byteOffset + entry.localHeaderOffset, bytes.length - entry.localHeaderOffset);
    if (getUint32(localView, 0) !== 0x04034b50) {
      throw new Error(`Invalid local header for ${entry.name}.`);
    }
    const fileNameLength = getUint16(localView, 26);
    const extraFieldLength = getUint16(localView, 28);
    const dataStart = entry.localHeaderOffset + 30 + fileNameLength + extraFieldLength;
    const compressedBytes = bytes.subarray(dataStart, dataStart + entry.compressedSize);
    if (entry.method === 0) return compressedBytes;
    if (entry.method === 8) return inflateRaw(compressedBytes);
    throw new Error(`Unsupported zip compression method ${entry.method} for ${entry.name}.`);
  }

  async function loadZipEntries(input) {
    const buffer = input instanceof ArrayBuffer ? input : await input.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const entries = parseCentralDirectory(bytes);
    return {
      entries,
      async getText(name) {
        const entry = entries.find(item => item.name === name);
        if (!entry) return null;
        const data = await extractEntry(bytes, entry);
        return textDecoder.decode(data);
      },
      has(name) {
        return entries.some(item => item.name === name);
      }
    };
  }

  global.SidekickZip = {
    FAST_STORE_EXTENSIONS: new Set(['zip', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'mp3', 'mp4', 'm4a', 'mov', 'avi', 'mkv', 'pdf', '7z', 'rar']),
    crc32,
    createZip,
    loadZipEntries
  };
})(typeof self !== 'undefined' ? self : window);
