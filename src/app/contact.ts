import { Component } from '@angular/core';
import { setPageMetadata } from './page-metadata';

@Component({
  selector: 'site-contact',
  templateUrl: './contact.html',
})
export class Contact {
  constructor() {
    setPageMetadata(
      'Contact | Justin Clagg',
      'Contact Justin Clagg by email, or find him on GitHub and LinkedIn.',
      '/contact/',
    );
  }
}
