import { Component, inject } from '@angular/core';
import { isActive, Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'site-root',
  imports: [RouterOutlet],
  template: `
    <a class="skip-link" [attr.href]="contactPage() ? '/contact/#content' : '/#content'">Skip to content</a>
    <header class="site-header frame">
      <a class="wordmark" href="/">Justin Clagg</a>
      <nav aria-label="Main">
        <ul>
          <li><a href="/" [attr.aria-current]="aboutPage() ? 'page' : null">About</a></li>
          <li><a href="/contact/" [attr.aria-current]="contactPage() ? 'page' : null">Contact</a></li>
        </ul>
      </nav>
    </header>
    <main id="content" tabindex="-1"><router-outlet /></main>
    <footer class="site-footer">
      <div class="frame">© Justin Clagg</div>
    </footer>
  `,
})
export class App {
  private readonly router = inject(Router);
  private readonly pathMatch = { paths: 'exact' } as const;

  protected readonly aboutPage = isActive('/', this.router, this.pathMatch);
  protected readonly contactPage = isActive('/contact', this.router, this.pathMatch);
}
