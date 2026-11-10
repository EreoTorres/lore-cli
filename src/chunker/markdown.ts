import crypto from 'node:crypto';
import matter from 'gray-matter';
import type { DocChunk, ChunkMetadata } from '../core/types.js';

interface Paragraph {
  text: string;
  startLine: number;
  endLine: number;
}

export function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function parseMarkdownFile(
  rawContent: string,
  filePath: string,
  options: { chunkSize?: number; chunkOverlap?: number } = {}
): DocChunk[] {
  const chunkSize = options.chunkSize || 800;
  const chunkOverlap = options.chunkOverlap ?? 100;
  const parsedMatter = matter(rawContent);
  const metadata: ChunkMetadata = { ...parsedMatter.data };
  const markdownBody = parsedMatter.content;

  const rawLineCount = rawContent.split(/\r?\n/).length;
  const lines = markdownBody.split(/\r?\n/);
  // gray-matter strips the frontmatter block; line numbers must map to the raw file on disk
  const lineOffset = rawLineCount - lines.length;
  const chunks: DocChunk[] = [];

  // Track active hierarchy
  const hierarchy: { level: number; text: string }[] = [];
  let currentBlockLines: { text: string; line: number }[] = [];
  let blockStartLine = 1;

  const flushBlock = (startLine: number, endLine: number) => {
    if (currentBlockLines.length === 0) return;
    const text = currentBlockLines.map(l => l.text).join('\n').trim();
    if (!text) {
      currentBlockLines = [];
      return;
    }

    const sectionPath = hierarchy.map(h => h.text);
    const title = metadata.title as string || (hierarchy.length > 0 ? hierarchy[hierarchy.length - 1].text : filePath);

    const pushChunk = (content: string, chunkStart: number, chunkEnd: number) => {
      const contextualContent = sectionPath.length > 0
        ? `[Section: ${sectionPath.join(' > ')}]\n${content}`
        : content;
      const realStart = chunkStart + lineOffset;
      const realEnd = chunkEnd + lineOffset;

      chunks.push({
        id: `${filePath}#L${realStart}-L${realEnd}`,
        filePath,
        title,
        sectionHierarchy: sectionPath,
        startLine: realStart,
        endLine: realEnd,
        content: contextualContent,
        hash: computeHash(contextualContent),
        metadata
      });
    };

    // If block is within acceptable size, add directly
    if (text.length <= chunkSize) {
      pushChunk(text, startLine, endLine);
    } else {
      // Split large sections by paragraphs, keeping real line ranges per paragraph
      const paragraphs: Paragraph[] = [];
      let buffer: { text: string; line: number }[] = [];
      const flushParagraph = () => {
        if (buffer.length === 0) return;
        paragraphs.push({
          text: buffer.map(l => l.text).join('\n'),
          startLine: buffer[0].line,
          endLine: buffer[buffer.length - 1].line
        });
        buffer = [];
      };
      for (const line of currentBlockLines) {
        if (line.text.trim() === '') {
          flushParagraph();
        } else {
          buffer.push(line);
        }
      }
      flushParagraph();

      let current: Paragraph[] = [];
      let currentLen = 0;
      const flushSubChunk = () => {
        if (current.length === 0) return;
        const content = current.map(p => p.text).join('\n\n');
        pushChunk(content, current[0].startLine, current[current.length - 1].endLine);
      };

      for (const p of paragraphs) {
        if (currentLen > 0 && currentLen + 2 + p.text.length > chunkSize) {
          flushSubChunk();
          // Carry trailing paragraphs into the next sub-chunk for context continuity
          const carried: Paragraph[] = [];
          let carriedLen = 0;
          for (let j = current.length - 1; j >= 0; j--) {
            if (carriedLen + current[j].text.length > chunkOverlap) break;
            carried.unshift(current[j]);
            carriedLen += current[j].text.length + 2;
          }
          current = carried;
          currentLen = carriedLen;
        }
        current.push(p);
        currentLen += (currentLen > 0 ? 2 : 0) + p.text.length;
      }
      flushSubChunk();
    }

    currentBlockLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      // Flush previous block
      flushBlock(blockStartLine, lineNumber - 1);

      const level = headerMatch[1].length;
      const text = headerMatch[2].trim();

      // Update hierarchy
      while (hierarchy.length > 0 && hierarchy[hierarchy.length - 1].level >= level) {
        hierarchy.pop();
      }
      hierarchy.push({ level, text });

      blockStartLine = lineNumber;
    } else {
      currentBlockLines.push({ text: line, line: lineNumber });
    }
  }

  flushBlock(blockStartLine, lines.length);

  // If no chunks were created (e.g. empty body with frontmatter), create a single summary chunk
  if (chunks.length === 0 && rawContent.trim().length > 0) {
    const text = rawContent.trim();
    chunks.push({
      id: `${filePath}#L1-L${rawLineCount}`,
      filePath,
      title: (metadata.title as string) || filePath,
      sectionHierarchy: [],
      startLine: 1,
      endLine: rawLineCount,
      content: text,
      hash: computeHash(text),
      metadata
    });
  }

  return chunks;
}
