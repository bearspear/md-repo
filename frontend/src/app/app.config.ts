import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideMarkdown } from 'ngx-markdown';
import hljs from 'highlight.js';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    provideMarkdown({
      markedExtensions: [
        {
          hooks: {
            postprocess(html) {
              console.log('[MARKED] Postprocess hook called');
              return html;
            }
          },
          renderer: {
            code(code, lang) {
              console.log('[HIGHLIGHT] Code block detected', { lang, codeLength: code.length });

              if (lang && hljs.getLanguage(lang)) {
                try {
                  const highlighted = hljs.highlight(code, { language: lang }).value;
                  console.log('[HIGHLIGHT] Successfully highlighted with language:', lang);
                  return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
                } catch (err) {
                  console.error('[HIGHLIGHT] Error highlighting with language:', lang, err);
                }
              }

              try {
                const result = hljs.highlightAuto(code);
                const detectedLang = result.language || 'plaintext';
                console.log('[HIGHLIGHT] Successfully auto-highlighted, detected:', detectedLang);
                return `<pre><code class="hljs language-${detectedLang}">${result.value}</code></pre>`;
              } catch (err) {
                console.error('[HIGHLIGHT] Auto-highlight error:', err);
                return `<pre><code>${code}</code></pre>`;
              }
            }
          }
        }
      ]
    })
  ]
};
