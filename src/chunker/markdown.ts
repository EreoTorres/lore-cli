import crypto from 'node:crypto';
import matter from 'gray-matter';
import type { DocChunk, ChunkMetadata } from '../core/types.js';

interface HeaderNode {
  level: number;
  text: string;
  line: number;
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
  const parsedMatter = matter(rawContent);
  const metadata: ChunkMetadata = { ...parsedMatter.data };
  const markdownBody = parsedMatter.content;

  const lines = markdownBody.split(/\r?\n/);
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

    // If block is within acceptable size, add directly
    if (text.length <= chunkSize) {
      const contextualContent = hierarchy.length > 0
        ? `[Section: ${sectionPath.join(' > ')}]\n${text}`
        : text;

      chunks.push({
        id: `${filePath}#L${startLine}-L${endLine}`,
        filePath,
        title,
        sectionHierarchy: sectionPath,
        startLine,
        endLine,
        content: contextualContent,
        hash: computeHash(contextualContent),
        metadata
      });
    } else {
      // Split large sections by paragraphs
      const paragraphs = text.split(/\n\s*\n/);
      let subBuffer = '';
      let subStartLine = startLine;

      for (const p of paragraphs) {
        if ((subBuffer + '\n\n' + p).length > chunkSize && subBuffer.length > 0) {
          const contextualContent = `[Section: ${sectionPath.join(' > ')}]\n${subBuffer.trim()}`;
          chunks.push({
            id: `${filePath}#L${subStartLine}-L${endLine}`,
            filePath,
            title,
            sectionHierarchy: sectionPath,
            startLine: subStartLine,
            endLine,
            content: contextualContent,
            hash: computeHash(contextualContent),
            metadata
          });
          subBuffer = p;
          subStartLine = endLine; // approximate
        } else {
          subBuffer = subBuffer ? `${subBuffer}\n\n${p}` : p;
        }
      }

      if (subBuffer.trim().length > 0) {
        const contextualContent = `[Section: ${sectionPath.join(' > ')}]\n${subBuffer.trim()}`;
        chunks.push({
          id: `${filePath}#L${subStartLine}-L${endLine}`,
          filePath,
          title,
          sectionHierarchy: sectionPath,
          startLine: subStartLine,
          endLine,
          content: contextualContent,
          hash: computeHash(contextualContent),
          metadata
        });
      }
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
      id: `${filePath}#L1-L${lines.length}`,
      filePath,
      title: (metadata.title as string) || filePath,
      sectionHierarchy: [],
      startLine: 1,
      endLine: lines.length,
      content: text,
      hash: computeHash(text),
      metadata
    });
  }

  return chunks;
}
