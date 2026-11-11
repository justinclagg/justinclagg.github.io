import { Component, DestroyRef, inject, signal } from '@angular/core';
import { setPageMetadata } from './page-metadata';

@Component({
  selector: 'site-contact',
  templateUrl: './contact.html',
})
export class Contact {
  readonly email = 'work@justinclagg.com';
  readonly copied = signal(false);
  private copyTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    setPageMetadata(
      'Contact | Justin Clagg',
      'Contact Justin Clagg by email, or find him on GitHub and LinkedIn.',
      '/contact/',
    );
    this.destroyRef.onDestroy(() => {
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
    });
  }

  async copyEmail(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.email);
        this.copied.set(true);
        if (this.copyTimeout) clearTimeout(this.copyTimeout);
        this.copyTimeout = setTimeout(() => this.copied.set(false), 2000);
      }
    } catch {
      // Ignore clipboard write failures gracefully
    }
  }
}
