/**
 * PlagiCheck - Document Parser Service
 * Extracts raw textual content from uploaded PDF, DOCX, DOC, and TXT files in browser.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
// @ts-ignore - mammoth does not have bundled TS definitions
import * as mammoth from 'mammoth';

// Configure PDF.js worker using local bundled worker (zero external CDN reliance)
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker || '/pdf.worker.min.js';
  } catch (e) {
    console.warn('PDF.js worker initialization warning:', e);
  }
}

export interface ParsedDocument {
  text: string;
  fileName: string;
  fileSizeFormatted: string;
  fileType: 'pdf' | 'docx' | 'doc' | 'txt' | 'unknown';
  pageCount?: number;
  wordCount: number;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Fallback binary text extractor for uncompressed or raw PDF text streams
 */
function extractTextFromPdfBinary(arrayBuffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    const textDecoder = new TextDecoder('latin1');
    const raw = textDecoder.decode(bytes);

    const extracted: string[] = [];
    // 1. (Text) Tj
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let match: RegExpExecArray | null;
    while ((match = tjRegex.exec(raw)) !== null) {
      if (match[1] && match[1].length > 1) {
        extracted.push(match[1].replace(/\\([()\\])/g, '$1'));
      }
    }

    // 2. [(T) -10 (e) -20 (xt)] TJ
    const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(raw)) !== null) {
      const inside = match[1];
      const itemRegex = /\(([^)]+)\)/g;
      let itemMatch: RegExpExecArray | null;
      const wordParts: string[] = [];
      while ((itemMatch = itemRegex.exec(inside)) !== null) {
        wordParts.push(itemMatch[1].replace(/\\([()\\])/g, '$1'));
      }
      if (wordParts.length > 0) {
        extracted.push(wordParts.join(''));
      }
    }

    return extracted.join(' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

/**
 * Extracts text from PDF files using pdfjs-dist with multi-level fallbacks
 */
async function parsePdf(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  // Ensure workerSrc is always set
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker || '/pdf.worker.min.js';
  }

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer.slice(0)),
      useWorkerFetch: false,
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const textPieces: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageStrings: string[] = [];

        for (const item of content.items) {
          if ('str' in item && typeof item.str === 'string') {
            pageStrings.push(item.str);
          }
        }

        const pageText = pageStrings.join(' ').replace(/\s+/g, ' ').trim();
        if (pageText) {
          textPieces.push(pageText);
        }
      } catch (pageErr) {
        console.warn(`Error extracting text from PDF page ${i}:`, pageErr);
      }
    }

    const fullText = textPieces.join('\n\n').trim();
    if (fullText.length > 0) {
      return {
        text: fullText,
        pageCount
      };
    }
  } catch (workerErr) {
    console.warn('Primary PDF.js parser warning, attempting fallback extraction:', workerErr);
  }

  // Fallback: If worker failed or was blocked by browser security, attempt binary stream parser
  const fallbackResult = extractTextFromPdfBinary(arrayBuffer);
  if (fallbackResult && fallbackResult.length > 15) {
    return {
      text: fallbackResult,
      pageCount: 1
    };
  }

  throw new Error('Could not extract readable text from this PDF document. Please verify that the file contains selectable text rather than scanned raster images.');
}

/**
 * Extracts text from DOCX files using mammoth
 */
async function parseDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value || '').trim();
}

/**
 * Fallback parser for legacy binary .doc files (Word 97-2003 OLE2 format)
 * Scans binary chunks for UTF-16LE and ASCII text streams.
 */
function parseLegacyDoc(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  const textFragments: string[] = [];
  let currentWord: number[] = [];

  // 1. Try ASCII / UTF-8 printable extraction
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    // Printable ASCII or newline/tab
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
      currentWord.push(byte);
    } else {
      if (currentWord.length >= 4) {
        const str = String.fromCharCode(...currentWord).trim();
        // Ignore binary junk or control strings
        if (str.length >= 3 && !/^[0-9\W]+$/.test(str) && !str.includes('Microsoft Word') && !str.includes('Root Entry')) {
          textFragments.push(str);
        }
      }
      currentWord = [];
    }
  }

  // 2. Try UTF-16LE extraction if ASCII yielded very few results
  if (textFragments.length < 10) {
    const utf16Fragments: string[] = [];
    for (let i = 0; i < bytes.length - 1; i += 2) {
      const charCode = bytes[i] | (bytes[i + 1] << 8);
      if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13 || charCode === 9) {
        currentWord.push(charCode);
      } else {
        if (currentWord.length >= 4) {
          const str = String.fromCharCode(...currentWord).trim();
          if (str.length >= 3 && !/^[0-9\W]+$/.test(str)) {
            utf16Fragments.push(str);
          }
        }
        currentWord = [];
      }
    }
    if (utf16Fragments.length > textFragments.length) {
      return utf16Fragments.join(' ').replace(/\s+/g, ' ').trim();
    }
  }

  return textFragments.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Main parser entry point
 */
export async function parseDocument(file: File): Promise<ParsedDocument> {
  const fileName = file.name;
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  const fileSizeFormatted = formatFileSize(file.size);

  let extractedText = '';
  let pageCount: number | undefined;
  let fileType: ParsedDocument['fileType'] = 'unknown';

  const arrayBuffer = await file.arrayBuffer();

  if (extension === '.pdf' || file.type === 'application/pdf') {
    fileType = 'pdf';
    const pdfData = await parsePdf(arrayBuffer);
    extractedText = pdfData.text;
    pageCount = pdfData.pageCount;
  } else if (
    extension === '.docx' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    fileType = 'docx';
    extractedText = await parseDocx(arrayBuffer);
  } else if (extension === '.doc' || file.type === 'application/msword') {
    fileType = 'doc';
    try {
      // Sometimes .doc is actually a .docx renamed
      extractedText = await parseDocx(arrayBuffer);
    } catch {
      // Fallback to binary .doc extractor
      extractedText = parseLegacyDoc(arrayBuffer);
    }
  } else if (extension === '.txt' || file.type.startsWith('text/')) {
    fileType = 'txt';
    const textDecoder = new TextDecoder('utf-8');
    extractedText = textDecoder.decode(arrayBuffer).trim();
  } else {
    // Attempt fallback text or docx decoding
    try {
      extractedText = await parseDocx(arrayBuffer);
      fileType = 'docx';
    } catch {
      const textDecoder = new TextDecoder('utf-8');
      extractedText = textDecoder.decode(arrayBuffer).trim();
      fileType = 'txt';
    }
  }

  // Clean and normalize spacing
  extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  const words = extractedText ? extractedText.split(/\s+/).filter(Boolean) : [];

  return {
    text: extractedText,
    fileName,
    fileSizeFormatted,
    fileType,
    pageCount,
    wordCount: words.length
  };
}
