import { mergeApplicationConfig } from '@angular/core';
import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, RenderMode, withRoutes } from '@angular/ssr';
import { App } from './app/app';
import { appConfig } from './app/app.config';

const config = mergeApplicationConfig(appConfig, {
  providers: [
    provideServerRendering(withRoutes([
      { path: '', renderMode: RenderMode.Prerender },
      { path: 'contact', renderMode: RenderMode.Prerender },
      { path: '**', renderMode: RenderMode.Prerender },
    ])),
  ],
});

export default (context: BootstrapContext) => bootstrapApplication(App, config, context);
