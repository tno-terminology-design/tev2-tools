import { Entry } from "./Glossary.js";
import Handlebars from 'handlebars';

export class Converter {
      private type: string;
      private template: string;

      public constructor({ template }: { template: any }) {
            const map: { [key: string]: string } = {
                  http: '<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}">{{showtext}}</a>',
                  essif: '<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}" title="{{glossaryText}}">{{showtext}}</a>', 
                  markdown: '[{{showtext}}]({{navurl}}{{#trait}}#{{/trait}}{{trait}})',
            };

            let key = template.toLowerCase()
            let exist = map.hasOwnProperty(key);
            // Check if the template parameter is a key in the defaults map
            if (exist) {
                  this.type = key;
                  this.template = map[key];
            } else {
                  this.type = 'custom';
                  this.template = template;
            }
      }

      convert(entry: Entry, term: Map<string, string>): string {
            const template = Handlebars.compile(this.template, {noEscape: true});

            // Merge the term properties with the entry properties
            const data = {
                  ...entry,
                  ...Object.fromEntries(term),
            };

            return template(data);
      }

      getType(): string {
            return this.type;
      }
}
