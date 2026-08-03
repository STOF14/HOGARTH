import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Renders every page of a PDF to a PNG blob URL. Pages render at 2x scale,
// which is a reasonable balance between legibility and memory use for
// typical comic-page dimensions -- worth revisiting if real-world PDFs
// turn out to need higher resolution for detailed line art.
const RENDER_SCALE = 2;

export async function extractPdfPages(file, onProgress){
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pageCount = pdf.numPages;

  if (pageCount === 0){
    throw new Error('This PDF has no pages.');
  }

  const urls = [];
  for (let i = 0; i < pageCount; i++){
    const page = await pdf.getPage(i + 1);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    urls.push(URL.createObjectURL(blob));
    if (onProgress) onProgress(i, pageCount);
    page.cleanup();
  }

  return {
    files: Array.from({ length: pageCount }, (_, i) => ({ name: `page-${i + 1}` })),
    urls
  };
}
