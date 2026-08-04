// Archive/document loader, LRU page cache, and format dispatch.
//
// .cbz / .zip  -> jszip (bundled, no network dependency)
// .cbr / .rar  -> node-unrar-js (official unrar compiled to WASM, bundled)
// .pdf         -> pdfjs-dist, pages rendered to canvas/PNG
//
// All three converge on the same return shape: { files, cache }, where
// cache.get(i) returns an object URL for page i. This is what lets
// ReaderPanel stay format-agnostic.
import JSZip from 'jszip';
import { createExtractorFromData } from 'node-unrar-js';
import { getUnrarWasmBinary } from './unrarWasm.js';
import { extractPdfPages } from './pdfSource.js';

export class PageCache {
  constructor(limit = 32){ this.limit = limit; this.map = new Map(); }
  set(key, value){
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.limit){
      const k = this.map.keys().next().value;
      try{ URL.revokeObjectURL(this.map.get(k)); }catch(e){}
      this.map.delete(k);
    }
  }
  get(key){ return this.map.get(key); }
}

const IMAGE_RE = /\.(jpe?g|png|gif|webp)$/i;

function guessImageMime(name){
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.gif$/i.test(name)) return 'image/gif';
  if (/\.webp$/i.test(name)) return 'image/webp';
  return 'image/jpeg';
}

// node-unrar-js throws an UnrarError with a `.reason` code (e.g.
// ERAR_BAD_ARCHIVE, ERAR_UNKNOWN_FORMAT, ERAR_MISSING_PASSWORD) plus a
// `.message`. Surfacing that instead of a generic string is the difference
// between "it broke" and actually being able to diagnose why.
function describeUnrarError(err, prefix){
  const reason = err && err.reason ? ` [${err.reason}]` : '';
  const detail = err && err.message ? `: ${err.message}` : '';
  return `${prefix}${reason}${detail}`;
}

async function extractZip(file, onProgress){
  const ab = await file.arrayBuffer();
  let zip;
  try{
    zip = await JSZip.loadAsync(ab);
  } catch (err){
    throw new Error('Could not read this file as a ZIP/CBZ archive. It may be corrupt or a different format.');
  }

  const entries = Object.values(zip.files)
    .filter(f => !f.dir && IMAGE_RE.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  if (!entries.length){
    throw new Error('No image files found inside the archive.');
  }

  const cache = new PageCache(64);
  for (let i = 0; i < entries.length; i++){
    const entry = entries[i];
    const blob = await entry.async('blob');
    const typed = blob.type ? blob : new Blob([blob], { type: guessImageMime(entry.name) });
    cache.set(i, URL.createObjectURL(typed));
    if (onProgress) onProgress(i, entries.length);
  }
  return { files: entries.map(e => ({ name: e.name })), cache };
}

async function extractRar(file, onProgress){
  const data = await file.arrayBuffer();
  let wasmBinary;
  try{
    wasmBinary = await getUnrarWasmBinary();
  } catch (err){
    console.error('[archive.js] Failed to load unrar WASM binary:', err);
    throw new Error('Could not load the RAR decoder. Check your connection and try again.');
  }

  let extractor;
  try{
    extractor = await createExtractorFromData({ wasmBinary, data });
  } catch (err){
    console.error('[archive.js] createExtractorFromData failed:', err);
    throw new Error(describeUnrarError(err, 'Could not open this file as a RAR/CBR archive'));
  }

  let headers;
  try{
    const list = extractor.getFileList();
    headers = Array.from(list.fileHeaders)
      .filter(h => !h.flags.directory && IMAGE_RE.test(h.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  } catch (err){
    console.error('[archive.js] getFileList() failed:', err);
    throw new Error(describeUnrarError(err, 'Could not read the contents of this RAR/CBR archive'));
  }

  if (!headers.length){
    throw new Error('No image files found inside the archive.');
  }
  if (headers.some(h => h.flags.encrypted)){
    throw new Error('This RAR archive is password-protected, which is not supported.');
  }

  const nameToIndex = new Map(headers.map((h, idx) => [h.name, idx]));
  const cache = new PageCache(64);

  let extractedGen;
  try{
    ({ files: extractedGen } = extractor.extract({ files: headers.map(h => h.name) }));
  } catch (err){
    console.error('[archive.js] extract() failed:', err);
    throw new Error(describeUnrarError(err, 'Could not extract pages from this RAR/CBR archive'));
  }

  let extractedCount = 0;
  try{
    for (const arcFile of extractedGen){
      if (!arcFile.extraction) continue;
      const idx = nameToIndex.get(arcFile.fileHeader.name);
      if (idx === undefined) continue;
      const blob = new Blob([arcFile.extraction], { type: guessImageMime(arcFile.fileHeader.name) });
      cache.set(idx, URL.createObjectURL(blob));
      extractedCount++;
      if (onProgress) onProgress(idx, headers.length);
    }
  } catch (err){
    console.error('[archive.js] error while iterating extracted pages:', err);
    throw new Error(describeUnrarError(err, `Could not extract pages from this RAR/CBR archive (got ${extractedCount} of ${headers.length} before failing)`));
  }

  if (extractedCount === 0){
    throw new Error('Could not extract any pages from this RAR/CBR archive.');
  }
  return { files: headers.map(h => ({ name: h.name })), cache };
}

async function extractPdf(file, onProgress){
  let result;
  try{
    result = await extractPdfPages(file, onProgress);
  } catch (err){
    throw new Error(err && err.message ? err.message : 'Could not read this PDF.');
  }
  const cache = new PageCache(64);
  result.urls.forEach((url, i) => cache.set(i, url));
  return { files: result.files, cache };
}

export async function decodeComicArchive(file, onProgress){
  const name = (file && file.name) || '';
  if (/\.pdf$/i.test(name)) return extractPdf(file, onProgress);
  if (/\.cbr$|\.rar$/i.test(name)) return extractRar(file, onProgress);
  if (/\.cbz$|\.zip$/i.test(name)) return extractZip(file, onProgress);
  throw new Error('Unsupported file type. Use .cbz, .cbr, or .pdf.');
}
