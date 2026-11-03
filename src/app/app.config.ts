import { LocationStrategy, TrailingSlashPathLocationStrategy } from '@angular/common';
import { ApplicationConfig } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Contact } from './contact';
import { Home } from './home';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LocationStrategy, useClass: TrailingSlashPathLocationStrategy },
    provideClientHydration(),
    provideRouter([
      { path: '', pathMatch: 'full', component: Home },
      { path: 'contact', component: Contact },
    ]),
  ],
};
