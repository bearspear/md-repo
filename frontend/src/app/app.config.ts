import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideMarkdown, MARKED_OPTIONS } from 'ngx-markdown';
import hljs from 'highlight.js';
import * as katex from 'katex';
import { markedEmoji } from 'marked-emoji';
import markedFootnote from 'marked-footnote';
import emojiData from 'emojilib';

import { routes } from './app.routes';

// Transform emojilib data to the format needed by marked-emoji
// emojilib format: { "😀": ["grinning_face", "smile", ...] }
// marked-emoji needs: { "grinning_face": "😀", "smile": "😀", ... }
const emojis: Record<string, string> = {};
Object.keys(emojiData).forEach((emoji) => {
  const names = emojiData[emoji];
  names.forEach((name: string) => {
    // Use the first occurrence of each name
    if (!emojis[name]) {
      emojis[name] = emoji;
    }
  });
});

// Shared state for math placeholders between preprocess and postprocess
let mathPlaceholders: { id: string, html: string }[] = [];

// Helper function to parse array from YAML-like syntax
function parseYamlArray(str: string): any[] {
  // Remove brackets and split by comma
  const content = str.replace(/^\[|\]$/g, '').trim();
  if (!content) return [];

  return content.split(',').map(item => {
    const trimmed = item.trim();
    // Try to parse as number
    const num = Number(trimmed);
    if (!isNaN(num)) return num;
    // Remove quotes if present, otherwise return as string
    return trimmed.replace(/^["']|["']$/g, '');
  });
}

// Helper function to parse YAML-like chart configuration
function parseChartConfig(yamlStr: string): any {
  const lines = yamlStr.split('\n');
  const config: any = { type: 'line', data: { labels: [], datasets: [] } };

  let currentDataset: any = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('type:')) {
      config.type = trimmed.split(':')[1].trim();
    } else if (trimmed.startsWith('labels:')) {
      const labelsStr = trimmed.substring(trimmed.indexOf('['));
      config.data.labels = parseYamlArray(labelsStr);
    } else if (trimmed.startsWith('- label:')) {
      if (currentDataset) {
        config.data.datasets.push(currentDataset);
      }
      currentDataset = { label: trimmed.split(':')[1].trim(), data: [] };
    } else if (trimmed.startsWith('data:') && currentDataset) {
      const dataStr = trimmed.substring(trimmed.indexOf('['));
      currentDataset.data = parseYamlArray(dataStr);
    } else if (trimmed.startsWith('borderColor:') && currentDataset) {
      currentDataset.borderColor = trimmed.split(':')[1].trim();
    } else if (trimmed.startsWith('backgroundColor:') && currentDataset) {
      currentDataset.backgroundColor = trimmed.split(':')[1].trim();
    }
  }

  if (currentDataset) {
    config.data.datasets.push(currentDataset);
  }

  return config;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    provideMarkdown({
      markedOptions: {
        provide: MARKED_OPTIONS,
        useValue: {
          gfm: true,
          breaks: true,
          pedantic: false,
        },
      },
      markedExtensions: [
        markedEmoji({
          emojis,
          renderer: (token) => token.emoji
        }),
        markedFootnote(),
        {
          hooks: {
            preprocess(markdown) {
              console.log('[PREPROCESS] Starting, markdown length:', markdown.length);
              // Process math expressions BEFORE Marked parses markdown
              // We'll use HTML comment placeholders to protect math from being processed by Marked
              mathPlaceholders = [];
              let counter = 0;

              // Process block math: $$...$$
              markdown = markdown.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
                try {
                  const html = katex.renderToString(math.trim(), {
                    displayMode: true,
                    throwOnError: false,
                    trust: true
                  });
                  const id = `<!--MATH_BLOCK_${counter++}-->`;
                  mathPlaceholders.push({ id, html });
                  return id;
                } catch (err) {
                  console.error('[KATEX] Error rendering block math:', err);
                  return match;
                }
              });

              // Process inline math: $...$
              markdown = markdown.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
                try {
                  const html = katex.renderToString(math.trim(), {
                    displayMode: false,
                    throwOnError: false,
                    trust: true
                  });
                  const id = `<!--MATH_INLINE_${counter++}-->`;
                  mathPlaceholders.push({ id, html });
                  return id;
                } catch (err) {
                  console.error('[KATEX] Error rendering inline math:', err);
                  return match;
                }
              });

              console.log('[PREPROCESS] Finished, placeholders:', mathPlaceholders.length, 'output length:', markdown.length);
              return markdown;
            },
            postprocess(html) {
              console.log('[POSTPROCESS] Starting, html length:', html.length, 'placeholders to replace:', mathPlaceholders.length);

              // Replace placeholders with rendered math HTML
              mathPlaceholders.forEach((item: { id: string, html: string }) => {
                const before = html.length;
                html = html.replace(item.id, item.html);
                const after = html.length;
                console.log('[POSTPROCESS] Replacing', item.id, 'found:', before !== after);
              });

              // Process callouts/admonitions (our custom syntax)
              html = html.replace(/<p>:::(note|warning|tip|danger|info)\s*\n?([\s\S]*?):::<\/p>/g, (match, type, content) => {
                const icons: Record<string, string> = {
                  'note': 'ℹ️',
                  'info': 'ℹ️',
                  'warning': '⚠️',
                  'tip': '💡',
                  'danger': '⛔'
                };
                const icon = icons[type] || 'ℹ️';
                const title = type.charAt(0).toUpperCase() + type.slice(1);
                return `<div class="callout callout-${type}"><div class="callout-title"><span class="callout-icon">${icon}</span> ${title}</div><div class="callout-content">${content.trim()}</div></div>`;
              });

              // Process GitHub-style alerts: > [!NOTE]
              html = html.replace(/<blockquote>\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]([\s\S]*?)<\/p>\s*<\/blockquote>/gi, (match, type, content) => {
                const typeMap: Record<string, { class: string, icon: string, title: string }> = {
                  'NOTE': { class: 'note', icon: 'ℹ️', title: 'Note' },
                  'TIP': { class: 'tip', icon: '💡', title: 'Tip' },
                  'IMPORTANT': { class: 'info', icon: '❗', title: 'Important' },
                  'WARNING': { class: 'warning', icon: '⚠️', title: 'Warning' },
                  'CAUTION': { class: 'danger', icon: '⛔', title: 'Caution' }
                };
                const alertType = typeMap[type.toUpperCase()] || typeMap['NOTE'];
                return `<div class="callout callout-${alertType.class}"><div class="callout-title"><span class="callout-icon">${alertType.icon}</span> ${alertType.title}</div><div class="callout-content">${content.trim()}</div></div>`;
              });

              console.log('[POSTPROCESS] Finished, returning html length:', html.length);
              return html;
            }
          },
          renderer: {
            code(code, lang) {
              console.log('[HIGHLIGHT] Code block detected', { lang, codeLength: code.length });

              // Parse advanced code block syntax: ```lang:filename {highlights} +/-
              let filename = '';
              let highlights: number[] = [];
              let showDiff = false;

              if (lang) {
                const parts = lang.split(':');
                const mainLang = parts[0];

                if (parts.length > 1) {
                  // Extract filename and other options
                  const rest = parts.slice(1).join(':');
                  const filenameMatch = rest.match(/^([^\s{]+)/);
                  if (filenameMatch) {
                    filename = filenameMatch[1];
                  }

                  // Extract highlight ranges {1,3-5}
                  const highlightMatch = rest.match(/\{([^}]+)\}/);
                  if (highlightMatch) {
                    const ranges = highlightMatch[1].split(',');
                    ranges.forEach(range => {
                      if (range.includes('-')) {
                        const [start, end] = range.split('-').map(Number);
                        for (let i = start; i <= end; i++) {
                          highlights.push(i);
                        }
                      } else {
                        highlights.push(Number(range));
                      }
                    });
                  }

                  // Check for diff markers
                  if (rest.includes('+') || rest.includes('-')) {
                    showDiff = true;
                  }
                }

                lang = mainLang;
              }

              // Mermaid diagrams
              if (lang === 'mermaid') {
                return `<pre class="mermaid">${code}</pre>`;
              }

              // Chart.js charts
              if (lang === 'chart') {
                try {
                  const chartId = `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  // Parse YAML-like syntax to JSON
                  const config = parseChartConfig(code);
                  const configJson = JSON.stringify(config);
                  const html = `<div class="chart-container"><canvas id="${chartId}" class="chart-canvas" data-chart-config="${configJson.replace(/"/g, '&quot;')}"></canvas></div>`;
                  console.log('[CHART] Returning HTML:', html);
                  return html;
                } catch (err) {
                  console.error('[CHART] Error parsing chart config:', err);
                  return `<pre><code>${code}</code></pre>`;
                }
              }

              // Regular code blocks with syntax highlighting
              let highlighted = code;
              if (lang && hljs.getLanguage(lang)) {
                try {
                  highlighted = hljs.highlight(code, { language: lang }).value;
                } catch (err) {
                  console.error('[HIGHLIGHT] Error highlighting:', err);
                }
              } else {
                try {
                  const result = hljs.highlightAuto(code);
                  highlighted = result.value;
                  lang = result.language || 'plaintext';
                } catch (err) {
                  console.error('[HIGHLIGHT] Auto-highlight error:', err);
                }
              }

              // Build code block with advanced features
              const lines = highlighted.split('\n');
              const lineNumbersHtml = lines.map((line, i) => {
                const lineNum = i + 1;
                const isHighlighted = highlights.includes(lineNum);
                let lineClass = 'code-line';
                if (isHighlighted) lineClass += ' highlighted';

                // Check for diff markers
                const trimmedLine = line.trim();
                if (showDiff && trimmedLine.startsWith('+')) {
                  lineClass += ' diff-add';
                  line = line.replace(/^\+\s?/, '');
                } else if (showDiff && trimmedLine.startsWith('-')) {
                  lineClass += ' diff-remove';
                  line = line.replace(/^-\s?/, '');
                }

                return `<div class="${lineClass}"><span class="line-number">${lineNum}</span><span class="line-content">${line || ' '}</span></div>`;
              }).join('');

              let codeBlockHtml = '<div class="code-block-wrapper">';
              if (filename) {
                codeBlockHtml += `<div class="code-block-header"><span class="code-filename">${filename}</span><button class="code-copy-btn" title="Copy code">📋</button></div>`;
              } else {
                codeBlockHtml += `<div class="code-block-header"><button class="code-copy-btn" title="Copy code">📋</button></div>`;
              }
              codeBlockHtml += `<pre class="code-block-content"><code class="hljs language-${lang}">${lineNumbersHtml}</code></pre>`;
              codeBlockHtml += '</div>';

              return codeBlockHtml;
            }
          }
        }
      ]
    })
  ]
};
