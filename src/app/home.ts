import { Component } from '@angular/core';
import { setPageMetadata } from './page-metadata';

@Component({
  selector: 'site-home',
  templateUrl: './home.html',
})
export class Home {
  constructor() {
    setPageMetadata(
      'Justin Clagg',
      'Justin Clagg is a System Architect at GDIT working on web development, test automation, and software modernization.',
      '/',
    );
  }
}
