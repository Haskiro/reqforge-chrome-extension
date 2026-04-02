import { js_beautify } from 'js-beautify';

import type { BodyLanguage } from '@/types';

export const tryPrettify = (value: string): string => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

export const tryPrettifyJs = (value: string): string => {
  try {
    return js_beautify(value, { indent_size: 2 });
  } catch {
    return value;
  }
};

export const detectBodyLanguage = (headers: Record<string, string>, body: string): BodyLanguage => {
  const contentType =
    Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1] ?? '';
  if (contentType.includes('application/json')) return 'json';
  if (contentType.includes('javascript')) return 'javascript';
  if (contentType.includes('text/html')) return 'html';
  if (contentType.includes('xml')) return 'xml';
  try {
    JSON.parse(body);
    return 'json';
  } catch {
    return 'html';
  }
};

export const prettifyBody = (body: string, language: BodyLanguage): string => {
  if (language === 'json') return tryPrettify(body);
  if (language === 'javascript') return tryPrettifyJs(body);
  return body;
};

export const buildRequestFirstLine = (method: string, url: string) => `${method} ${url}`;
export const buildResponseFirstLine = (status: number) => String(status);

export const parseRequestFirstLine = (line: string): { method: string; url: string } => {
  const spaceIndex = line.indexOf(' ');
  if (spaceIndex === -1) return { method: line.trim(), url: '' };
  return { method: line.slice(0, spaceIndex).trim(), url: line.slice(spaceIndex + 1).trim() };
};

export const parseResponseFirstLine = (line: string): number => {
  const parsed = parseInt(line.trim(), 10);
  return Number.isNaN(parsed) ? 200 : parsed;
};

export const buildRawText = (
  firstLine: string,
  headers: Record<string, string>,
  body: string | undefined,
): string => {
  const headerLines = Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  const headersBlock = headerLines ? `${firstLine}\n${headerLines}` : firstLine;
  return body ? `${headersBlock}\n\n${body}` : headersBlock;
};

export const parseRawText = (
  raw: string,
): { firstLine: string; headers: Record<string, string>; body: string } => {
  const separatorIndex = raw.indexOf('\n\n');
  const headerBlock = separatorIndex === -1 ? raw : raw.slice(0, separatorIndex);
  const body = separatorIndex === -1 ? '' : raw.slice(separatorIndex + 2);

  const lines = headerBlock.split('\n');
  const firstLine = lines[0] ?? '';

  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (key) headers[key] = value;
    }
  }

  return { firstLine, headers, body };
};
