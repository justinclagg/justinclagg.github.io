import {
  afterNextRender, Component, DestroyRef, effect, ElementRef, inject, Injector, input, signal,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { FlowEngine } from './flow-engine';
import { FlowSettingsStore } from './flow-settings-store';

@Component({
  selector: 'site-flow-field',
  template: '<canvas aria-hidden="true"></canvas>',
  host: { 'aria-hidden': 'true', '[attr.data-flow-state]': 'state()' },
})
export class FlowField {
  readonly contact = input(false);
  protected readonly state = signal<'running' | 'still' | 'paused'>('paused');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly store = inject(FlowSettingsStore);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  constructor() {
    afterNextRender(() => this.start());
  }

  private start() {
    const canvas = this.host.nativeElement.querySelector('canvas')!;
    const engine = FlowEngine.create(canvas, this.store.settings());
    if (!engine) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = signal(media.matches);
    const hidden = signal(document.hidden);
    let raf = 0, navigationFrame = 0, destroyed = false;
    let last = performance.now(), frames = 0, fpsT = last;
    let replay = this.store.replayRequests();
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const meta = (fps = 0) => {
      this.store.fps.set(fps);
      this.store.particleCount.set(engine.particleCount);
    };
    const frame = (now: number) => {
      engine.step(Math.min(3, (now - last) / 16.667), now);
      last = now;
      engine.render(now);
      frames++;
      if (now - fpsT > 1000) {
        meta(Math.round(frames * 1000 / (now - fpsT)));
        frames = 0; fpsT = now;
      }
      raf = requestAnimationFrame(frame);
    };
    const renderStopped = () => {
      if (this.state() === 'still') engine.drawStill(performance.now());
      else if (this.state() === 'paused') engine.render(performance.now());
      meta();
    };
    const measure = () => {
      const r = document.querySelector('main .intro')?.getBoundingClientRect();
      engine.setQuietRect(r ? { l: r.left - 24, t: r.top - 24, r: r.right + 24, b: r.bottom + 24 } : null);
    };
    const resize = () => {
      engine.resize(innerWidth, innerHeight, devicePixelRatio);
      measure();
      renderStopped();
    };
    resize();
    engine.replayIntro(last);
    const sync = effect(() => {
      engine.setSettings(this.store.settings(), performance.now());
      engine.setContact(this.contact());
      const request = this.store.replayRequests();
      if (request !== replay) { engine.replayIntro(performance.now()); replay = request; }
      const state = this.store.forceStill() || reduced() ? 'still'
        : hidden() || this.store.paused() ? 'paused' : 'running';
      this.state.set(state);
      if (state === 'running') {
        if (!raf) {
          last = performance.now(); frames = 0; fpsT = last;
          raf = requestAnimationFrame(frame);
        }
      } else {
        stop();
        // Do not track state or the lab telemetry as dependencies of this effect.
        if (state === 'still') engine.drawStill(performance.now());
        else engine.render(performance.now());
        meta();
      }
    }, { injector: this.injector });
    // Some embedded browsers skip visibilitychange when a page that loaded hidden is shown,
    // so re-read document.hidden on interaction and focus as well.
    const visibility = () => hidden.set(document.hidden);
    const move = (e: PointerEvent) => {
      if (hidden() !== document.hidden) visibility();
      if (e.target instanceof Element && e.target.closest('[data-flow-ignore]')) engine.pointerLeave();
      else engine.pointerMove(e.clientX, e.clientY, performance.now());
    };
    const leave = () => engine.pointerLeave();
    const motion = () => reduced.set(media.matches);
    const scroll = () => { measure(); if (this.state() === 'paused') engine.render(performance.now()); };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('mouseleave', leave);
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', scroll, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', visibility);
    window.addEventListener('pageshow', visibility);
    media.addEventListener('change', motion);
    void document.fonts.ready.then(() => { if (!destroyed) { measure(); renderStopped(); } });
    const navigation = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        cancelAnimationFrame(navigationFrame);
        navigationFrame = requestAnimationFrame(() => { measure(); renderStopped(); });
      }
    });
    this.destroyRef.onDestroy(() => {
      destroyed = true;
      stop(); cancelAnimationFrame(navigationFrame); sync.destroy(); navigation.unsubscribe();
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('mouseleave', leave);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', scroll);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('focus', visibility);
      window.removeEventListener('pageshow', visibility);
      media.removeEventListener('change', motion);
    });
  }
}
