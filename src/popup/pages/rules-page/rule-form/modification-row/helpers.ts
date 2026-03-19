import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';

import type { BodyLanguage } from '@/types';

export const getExtensions = (lang: BodyLanguage) => {
  switch (lang) {
    case 'json':
      return [json()];
    case 'xml':
      return [xml()];
    case 'html':
      return [html()];
    case 'javascript':
      return [javascript()];
    case 'formdata':
      return [];
  }
};
