import Handlebars from 'handlebars';
import { interpreter } from './Run.js'
import { Entry } from './Glossary.js';

type AnyObject = { [key: string]: any };


export class Converter {
      private type: string;
      private template: string;

      public constructor({ template }: { template: any }) {
            const map: { [key: string]: string } = {
                  html: '<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}">{{showtext}}</a>',
                  essif: '<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}" title="{{capFirst term}}: {{noRefs glossaryText}}">{{showtext}}</a>',
                  markdown: '[{{showtext}}]({{navurl}}{{#trait}}#{{/trait}}{{trait}})',
            };

            function noRefsHelper(text: string) {
                  // Then the resulting text is scanned for termrefs, and any termref that appears in the contents
                  // of the resulting text shall be replaced with the text that consists of the same words as the 
                  // of the termref, where the first character of every word is made uppercase and the other characters remain untouched.
                  let matches: RegExpMatchArray[] = Array.from(text.matchAll(interpreter!.getRegex()));

                  if (matches.length > 0) {
                        // Iterate over each match found in the text string
                        for (const match of matches) {
                              const termProperties: Map<string, string> = interpreter!.interpret(match);
                  
                              if (termProperties.get("showtext")) {
                                    // replace the match with the showtext property and make the first letter capitalized
                                    text = text.replace(match[0], capFirstHelper(termProperties.get("showtext")!));
                              }
                        }
                  }

                  return text;
            }

            function capFirstHelper(text: string) {
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
      }

      // Helper function to evaluate expressions inside properties
      private evaluateExpressions(input: string, data: AnyObject): string {
            const template = Handlebars.compile(input, {noEscape: true, compat: true});
            return template(data);
      }

      convert(entry: Entry, term: Map<string, string>): string {
            // Evaluate the properties inside the entry object
            const evaluatedEntry: AnyObject = {};
            for (const [key, value] of Object.entries(entry)) {
                  if (typeof value === 'string') {
                        evaluatedEntry[key] = this.evaluateExpressions(value, { ...entry, ...Object.fromEntries(term) });
                  } else {
                        evaluatedEntry[key] = value;
                  }
            }

            const template = Handlebars.compile(this.template, {noEscape: true, compat: true});

            return template(evaluatedEntry);
      }

      getType(): string {
            return this.type;
      }
}
