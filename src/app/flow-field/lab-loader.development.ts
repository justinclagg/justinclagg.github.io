import type { Type } from '@angular/core';

export function flowLabLoader(): (() => Promise<Type<unknown>>) | null {
  return () => import('./lab/flow-lab').then((m) => m.FlowLab);
}
