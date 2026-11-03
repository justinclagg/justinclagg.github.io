import { rm } from 'node:fs/promises';

// Keep Angular's internal client-rendered fallback out of the public artifact.
await rm(new URL('../dist/website/browser/index.csr.html', import.meta.url), { force: true });
