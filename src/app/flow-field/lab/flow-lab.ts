import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { FLOW_PRESETS, FLOW_RANGES, FlowSettings } from '../flow-settings';
import { FlowSettingsStore } from '../flow-settings-store';

const DESC_P: Record<FlowSettings['particle'], string> = {
  motes: 'Tiny points of light, like dust or plankton in water.',
  dashes: 'Short strokes pointing along the flow, like a weather wind map.',
  trails: 'Each particle leaves a short fading streak, tracing the current.',
  bokeh: 'Few, soft, out-of-focus discs at three depths; near ones drift faster.',
  nodes: 'Sparse dots that link with faint lines when close, like a system diagram.',
};
const DESC_M: Record<FlowSettings['motion'], string> = {
  curl: 'Curl current: smooth swirling ocean flow that slowly evolves.',
  laminar: 'Laminar drift: a steady left-to-right river with gentle meanders.',
  eddies: 'Slow eddies: a few large, drifting whirlpools.',
  tide: 'Tidal sway: everything rocks back and forth on a ~20 second cycle.',
  thermal: 'Thermal rise: slow upward drift with a sideways wobble.',
  circuit: 'Circuit: particles travel grid lines and turn at junctions, steered by the current.',
};

const CHOICES = {
  particle: ['motes', 'dashes', 'trails', 'bokeh', 'nodes'],
  motion: ['curl', 'laminar', 'eddies', 'tide', 'thermal', 'circuit'],
  cursor: ['none', 'wake', 'stir', 'attract'],
  color: ['white', 'seafoam', 'two'],
} as const;
const BOOLEAN = ['spot', 'grid', 'memory', 'glow', 'quiet'] as const;
type Choice = keyof typeof CHOICES;
type Numeric = keyof typeof FLOW_RANGES;
type BooleanSetting = typeof BOOLEAN[number];

@Component({
  selector: 'site-flow-lab',
  host: { 'data-flow-ignore': '', 'aria-label': 'Flow-field controls', '[hidden]': 'hidden()' },
  template: `
<div class="ph"><strong>Flow-field lab</strong><button (click)="collapsed.set(!collapsed())" title="Collapse (H hides)">{{ collapsed() ? '+' : '–' }}</button></div>
@if (!collapsed()) {
<div class="pb">
  <div class="sec">Presets</div>
  <div class="presets">
    @for (preset of presets; track preset[0]) {
      <button [class.on]="matches(preset[1])" (click)="applyPreset(preset[1])">{{ preset[0] }}</button>
    }
  </div>
  <p class="desc">{{ description() }}</p>
  <div class="sec">Mix and match</div>
<label class="sel">Particle <select [value]="store.settings().particle" (change)="choice('particle', $event)">
      <option value="motes">Motes: fine dust</option>
      <option value="dashes">Dashes: wind-map strokes</option>
      <option value="trails">Trails: fading streaks</option>
      <option value="bokeh">Bokeh: soft depth</option>
      <option value="nodes">Linked nodes</option>
    </select></label>
<label class="sel">Movement <select [value]="store.settings().motion" (change)="choice('motion', $event)">
      <option value="curl">Curl current</option>
      <option value="laminar">Laminar drift</option>
      <option value="eddies">Slow eddies</option>
      <option value="tide">Tidal sway</option>
      <option value="thermal">Thermal rise</option>
      <option value="circuit">Circuit (grid-routed)</option>
    </select></label>
<label class="sel">Cursor <select [value]="store.settings().cursor" (change)="choice('cursor', $event)">
      <option value="none">No push or pull</option>
      <option value="wake">Push away</option>
      <option value="stir">Stir</option>
      <option value="attract">Attract (route toward)</option>
    </select></label>
<label class="sel">Color <select [value]="store.settings().color" (change)="choice('color', $event)">
      <option value="white">White</option>
      <option value="seafoam">Seafoam</option>
      <option value="two">Two-tone</option>
    </select></label>
<label>Density <input type="range" [min]="ranges.density[0]" [max]="ranges.density[1]" [value]="store.settings().density" (input)="numeric('density', $event)"><output>{{ store.settings().density }}</output></label>
<label>Speed <input type="range" [min]="ranges.speed[0]" [max]="ranges.speed[1]" [value]="store.settings().speed" (input)="numeric('speed', $event)"><output>{{ store.settings().speed }}</output></label>
<label>Opacity <input type="range" [min]="ranges.opacity[0]" [max]="ranges.opacity[1]" [value]="store.settings().opacity" (input)="numeric('opacity', $event)"><output>{{ store.settings().opacity }}</output></label>
<label [style.opacity]="store.settings().particle !== 'trails' ? 0.4 : 1">Trail <input type="range" [min]="ranges.trail[0]" [max]="ranges.trail[1]" [value]="store.settings().trail" (input)="numeric('trail', $event)"><output>{{ store.settings().trail }}</output></label>
<div class="sec">Cursor visuals</div>
<label class="check"><input type="checkbox" [checked]="store.settings().spot" (change)="check('spot', $event)"> Spotlight: brighter near the cursor, dimmer elsewhere</label>
<label class="check"><input type="checkbox" [checked]="store.settings().grid" (change)="check('grid', $event)"> Reveal the grid around the cursor</label>
<label class="check"><input type="checkbox" [checked]="store.settings().memory" (change)="check('memory', $event)"> Reveal lingers along the cursor's path</label>
<label class="check"><input type="checkbox" [checked]="store.settings().glow" (change)="check('glow', $event)"> Junctions glow as particles pass (Circuit)</label>
<label>Pull radius <input type="range" [min]="ranges.radius[0]" [max]="ranges.radius[1]" [value]="store.settings().radius" (input)="numeric('radius', $event)"><output>{{ store.settings().radius }}</output></label>
<label>Grid radius <input type="range" [min]="ranges.gridRadius[0]" [max]="ranges.gridRadius[1]" [value]="store.settings().gridRadius" (input)="numeric('gridRadius', $event)"><output>{{ store.settings().gridRadius }}</output></label>
<label>Grid opacity <input type="range" [min]="ranges.gridOpacity[0]" [max]="ranges.gridOpacity[1]" [value]="store.settings().gridOpacity" (input)="numeric('gridOpacity', $event)"><output>{{ store.settings().gridOpacity }}</output></label>
<label>Spot radius <input type="range" [min]="ranges.spotRadius[0]" [max]="ranges.spotRadius[1]" [value]="store.settings().spotRadius" (input)="numeric('spotRadius', $event)"><output>{{ store.settings().spotRadius }}</output></label>
<label>Highlight <input type="range" [min]="ranges.highlight[0]" [max]="ranges.highlight[1]" [value]="store.settings().highlight" (input)="numeric('highlight', $event)"><output>{{ store.settings().highlight }}</output></label>

<p class="meta">Highlight brightens particles and lengthens their trails inside the grid radius (or the spotlight radius when the grid is off).</p>
<div class="sec">Page</div>
<label class="check"><input type="checkbox" [checked]="store.settings().quiet" (change)="check('quiet', $event)"> Dim particles behind the text</label>
<label class="check"><input type="checkbox" [checked]="store.forceStill()" (change)="store.forceStill.set(checked($event))"> Reduced-motion still frame</label>
<div class="row"><button (click)="replay()">Replay load-in</button><button (click)="store.paused.update(invert)">{{ store.paused() ? 'Play' : 'Pause' }}</button></div>
<button (click)="copyDefault()">Copy as site default</button>
<p class="meta" role="status">{{ copied() }}</p>
<details><summary>Site default snippet</summary><pre>{{ snippet() }}</pre></details>
<p class="meta">{{ store.forceStill() ? 'Still frame' : (store.fps() || '–') + ' fps' }} · {{ store.particleCount() }} particles{{ store.paused() ? ' · paused' : '' }}</p>
<p class="hint">H hides this panel · Space pauses when the page is focused · the URL keeps your settings</p>
</div>
}
`,
  styles: `:host { position: fixed; right: 16px; bottom: 16px; z-index: 10; box-sizing: border-box; width: min(320px, calc(100vw - 32px)); max-height: calc(100vh - 32px);
  overflow: hidden auto; font: 13px/1.4 system-ui, sans-serif; color: #e8f4f2;
  background: rgb(8 24 28 / 86%); backdrop-filter: blur(8px); border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 10px; box-shadow: 0 8px 30px rgb(0 0 0 / 30%); }
:host.collapsed .pb { display: none; }
:host .ph { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px;
  border-bottom: 1px solid rgb(255 255 255 / 12%); }
:host .pb { padding: 10px 14px 14px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
:host .pb > * { min-width: 0; }
:host button { font: inherit; color: inherit; background: rgb(255 255 255 / 8%);
  border: 1px solid rgb(255 255 255 / 18%); border-radius: 6px; padding: 4px 8px; cursor: pointer; }
:host button:hover { background: rgb(255 255 255 / 16%); }
:host button.on { background: #b0f0e4; color: #08303a; border-color: #b0f0e4; }
:host .presets { display: flex; flex-wrap: wrap; gap: 5px; }
:host .sec { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.6; margin-top: 4px; }
:host label { display: grid; grid-template-columns: 92px minmax(0, 1fr) 30px; align-items: center; gap: 6px; }
:host label.sel { grid-template-columns: 92px minmax(0, 1fr); }
:host label.check { grid-template-columns: 18px minmax(0, 1fr); }
:host select { font: inherit; color: inherit; background: rgb(255 255 255 / 8%);
  border: 1px solid rgb(255 255 255 / 18%); border-radius: 6px; padding: 3px 4px;
  width: 100%; min-width: 0; text-overflow: ellipsis; }
:host select option { background: #0c2a30; }
:host input[type=range] { width: 100%; min-width: 0; margin: 0; accent-color: #b0f0e4; }
:host output { text-align: right; opacity: 0.75; font-variant-numeric: tabular-nums; }
:host .row { display: flex; flex-wrap: wrap; gap: 6px; }
:host .desc { margin: 0; padding: 8px; border-radius: 6px; background: rgb(255 255 255 / 6%); }
:host .meta, :host .hint { margin: 0; opacity: 0.6; font-size: 12px; }

:host([hidden]) { display: none; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 11px; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #b0f0e4; outline-offset: 2px; }
`,
})
export class FlowLab {
  protected readonly store = inject(FlowSettingsStore);
  protected readonly hidden = signal(false);
  protected readonly collapsed = signal(false);
  protected readonly copied = signal('');
  protected readonly presets = Object.entries(FLOW_PRESETS);
  protected readonly ranges = FLOW_RANGES;
  protected readonly invert = (v: boolean) => !v;
  protected readonly description = computed(() => {
    const s = this.store.settings();
    return `${DESC_P[s.particle]} ${DESC_M[s.motion]}`;
  });
  protected readonly snippet = computed(() =>
    `export const SITE_EFFECT: FlowSettings = ${JSON.stringify(this.store.settings(), null, 2)};`);

  constructor() {
    const destroyRef = inject(DestroyRef);
    const router = inject(Router);
    this.readHash();
    effect(() => { this.store.settings(); this.store.forceStill(); this.writeHash(); this.copied.set(''); });
    const navigation = router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.writeHash();
    });
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable]')) return;
      if (event.key.toLowerCase() === 'h') this.hidden.update(this.invert);
      if (event.key === ' ' && event.target === document.body) { event.preventDefault(); this.store.paused.update(this.invert); }
    };
    window.addEventListener('keydown', keydown);
    destroyRef.onDestroy(() => { window.removeEventListener('keydown', keydown); navigation.unsubscribe(); });
  }

  protected checked(event: Event) { return (event.target as HTMLInputElement).checked; }
  protected check(key: BooleanSetting, event: Event) {
    this.store.settings.update((s) => ({ ...s, [key]: this.checked(event) }));
  }
  protected numeric(key: Numeric, event: Event) {
    const [min, max] = FLOW_RANGES[key];
    const value = Math.max(min, Math.min(max, Number((event.target as HTMLInputElement).value)));
    this.store.settings.update((s) => ({ ...s, [key]: value }));
  }
  protected choice(key: Choice, event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if ((CHOICES[key] as readonly string[]).includes(value)) {
      this.store.settings.update((s) => ({ ...s, [key]: value }));
    }
  }
  protected applyPreset(settings: FlowSettings) { this.store.settings.set({ ...settings }); }
  protected matches(settings: FlowSettings) {
    return (Object.keys(settings) as (keyof FlowSettings)[]).every((key) => this.store.settings()[key] === settings[key]);
  }
  protected replay() { this.store.forceStill.set(false); this.store.replayRequests.update((n) => n + 1); }
  protected async copyDefault() {
    try {
      await navigator.clipboard.writeText(this.snippet());
      this.copied.set('Copied');
    } catch {
      this.copied.set('Copy the snippet below.');
    }
  }
  private readHash() {
    const q = new URLSearchParams(location.hash.slice(1));
    const settings = { ...this.store.settings() };
    for (const key of Object.keys(CHOICES) as Choice[]) {
      const value = q.get(key);
      if (value !== null && (CHOICES[key] as readonly string[]).includes(value)) {
        Object.assign(settings, { [key]: value });
      }
    }
    for (const key of Object.keys(FLOW_RANGES) as Numeric[]) {
      const raw = q.get(key);
      if (raw === null || raw.trim() === '') continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) continue;
      const [min, max] = FLOW_RANGES[key];
      settings[key] = Math.max(min, Math.min(max, Math.round(value)));
    }
    for (const key of BOOLEAN) {
      const value = q.get(key);
      if (value === 'true' || value === 'false') settings[key] = value === 'true';
    }
    if (q.get('still') === 'true' || q.get('still') === 'false') this.store.forceStill.set(q.get('still') === 'true');
    this.store.settings.set(settings);
  }
  private writeHash() {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(this.store.settings())) q.set(key, String(value));
    q.set('still', String(this.store.forceStill()));
    history.replaceState(history.state, '', `${location.pathname}${location.search}#${q}`);
  }
}
