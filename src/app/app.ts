import { afterNextRender, Component, DestroyRef, inject, ViewContainerRef } from '@angular/core';
import { FlowField } from './flow-field/flow-field';
import { flowLabLoader } from './flow-field/lab-loader';
import { isActive, Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'site-root',
  imports: [RouterLink, RouterOutlet, FlowField],
  template: `
    @defer (on idle) { <site-flow-field [contact]="contactPage()" /> }
    <a class="skip-link" [attr.href]="contactPage() ? '/contact/#content' : '/#content'">Skip to content</a>
    <header class="site-header frame">
      <a class="wordmark" routerLink="/">Justin Clagg</a>
      <nav aria-label="Main">
        <ul>
          <li><a routerLink="/" [attr.aria-current]="aboutPage() ? 'page' : null">About</a></li>
          <li><a routerLink="/contact" [attr.aria-current]="contactPage() ? 'page' : null">Contact</a></li>
        </ul>
      </nav>
    </header>
    <main id="content" tabindex="-1"><router-outlet /></main>
    <footer class="site-footer" hidden>
      <div class="frame">© Justin Clagg</div>
    </footer>
  `,
})
export class App {
  constructor() {
    const container = inject(ViewContainerRef);
    const destroyRef = inject(DestroyRef);
    afterNextRender(async () => {
      const loader = flowLabLoader();
      if (loader) {
        const component = await loader();
        if (!destroyRef.destroyed) container.createComponent(component);
      }
    });
  }

  private readonly router = inject(Router);
  private readonly pathMatch = { paths: 'exact' } as const;

  protected readonly aboutPage = isActive('/', this.router, this.pathMatch);
  protected readonly contactPage = isActive('/contact', this.router, this.pathMatch);
}
