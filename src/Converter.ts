import Handlebars from 'handlebars';
import { log } from './Report.js';
import { interpreter } from './Run.js'
import { Entry } from './Glossary.js';

type AnyObject = { [key: string]: any };


export class Converter {
      private type: string;
      private template: string;

      public constructor({ template }: { template: any }) {
            const map: { [key: string]: string } = {
                  html: '<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}">{{showtext}}</a>',
                  essif: '<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}" title="{{capFirst term}}: {{noRefs glossaryText type="markdown"}}">{{showtext}}</a>',
                  markdown: '[{{showtext}}]({{navurl}}{{#trait}}#{{/trait}}{{trait}})',
            };

            Handlebars.registerHelper('noRefs', noRefsHelper);
            Handlebars.registerHelper('capFirst', capFirstHelper);
            Handlebars.registerHelper('ifValue', ifValueHelper);

            let key = template.toLowerCase();
            let exist = map.hasOwnProperty(key);
            // Check if the template parameter is a key in the defaults map
            if (exist) {
                  this.type = key;
                  this.template = map[key];
            } else {
                  this.type = 'custom';
                  this.template = template;
            }
            log.info(`Using ${this.type} template: '${this.template}'`)
      }

      convert(entry: Entry, term: Map<string, string>): string {
            let termObject = Object.fromEntries(term);

            // Evaluate the properties inside the entry object
            const evaluatedEntry: AnyObject = {};
            for (const [key, value] of Object.entries(entry)) {
                  if (typeof value === 'string') {
                        evaluatedEntry[key] = evaluateExpressions(value, { ...entry, termObject });
                  } else {
                        evaluatedEntry[key] = value;
                  }
            }

            const template = Handlebars.compile(this.template, {noEscape: true, compat: true});

            return template({ ...evaluatedEntry, ...termObject });
      }

      getType(): string {
            return this.type;
      }
}

function noRefsHelper(this: any, text: string, options: any) {
      if (!text) {
            return text;
      }

      let type = ['interpreter']
      if (options.hash.type !== undefined) {
            type = options.hash.type.split(',').forEach((element: string) => {
                  element = element.trim();
            });
      } else {
            // Default to interpreter if no type is specified
            options.hash.type = 'interpreter';
      }

      let regex: RegExp;

      type.forEach((element: string) => {
            // switch on element to determine which interpreter to use
            switch (element.toLowerCase()) {
                  case 'interpreter':
                        regex = interpreter!.getRegex();
                        break;
                  case 'html':
                        regex = new RegExp(/<a\b[^>]*?>(?<showtext>.*?)<\/a>/, 'g');
                        break;
                  case 'markdown':
                        regex = new RegExp(/\[(?<showtext>[^\]]+)\]\((?:[^)]+)\)/, 'g');
                        break;
                  default:
                        // assume the element is a custom regex
                        regex = new RegExp(element.replace(/^\/|\/[a-z]*$/g, ''), 'g')
            }

            let matches = Array.from(text.matchAll(regex)) as RegExpMatchArray[];

            if (matches.length > 0) {
                  // Iterate over each match found in the text string
                  for (const match of matches) {
                        const termProperties: Map<string, string> = interpreter!.interpret(match);
            
                        if (termProperties.get("showtext")) {
                              // replace the match with the showtext property and make the first letter(s) capitalized
                              text = text.replace(match[0], capFirstHelper(termProperties.get("showtext")!));
                        }
                  }
            }
      });

      return text;
}

function capFirstHelper(text: string) {
      if (!text) {
            return text;
      }

      // The first character of every word separated by spaces will be capitalized
      const words = text.split(' ');
      const capitalizedWords = words.map((word) =>
            word.charAt(0).toUpperCase() + word.slice(1)
      );
      return capitalizedWords.join(' ');
}

function ifValueHelper(this: any, conditional: any, options: any) {
      if (conditional == options.hash.equals) {
            return options.fn(this);
      } else {
            return options.inverse(this);
      }
};

// Helper function to evaluate expressions inside properties
function evaluateExpressions(input: string, data: AnyObject): string {
      const template = Handlebars.compile(input, {noEscape: true, compat: true});
      return template(data);
}
