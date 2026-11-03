import { Injectable, signal } from '@angular/core';
import { FlowSettings, SITE_EFFECT } from './flow-settings';

@Injectable({ providedIn: 'root' })
export class FlowSettingsStore {
  readonly settings = signal<FlowSettings>({ ...SITE_EFFECT });
  readonly paused = signal(false);
  readonly forceStill = signal(false);
  readonly replayRequests = signal(0);
  readonly fps = signal(0);
  readonly particleCount = signal(0);
}
