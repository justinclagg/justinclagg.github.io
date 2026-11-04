import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

const THEME_COLORS = { '/': '#006a6a', '/contact/': '#38569d' } as const;

export function setPageMetadata(title: string, description: string, path: '/' | '/contact/'): void {
  const url = `https://www.justinclagg.com${path}`;
  const document = inject(DOCUMENT);
  const meta = inject(Meta);

  inject(Title).setTitle(title);
  meta.updateTag({ name: 'description', content: description });
  meta.updateTag({ property: 'og:title', content: title });
  meta.updateTag({ property: 'og:description', content: description });
  meta.updateTag({ property: 'og:url', content: url });
  meta.updateTag({ name: 'theme-color', content: THEME_COLORS[path] });
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
}
