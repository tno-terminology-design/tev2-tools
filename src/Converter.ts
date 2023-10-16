import Handlebars from 'handlebars';
import { log } from './Report.js';
import { interpreter } from './Run.js'
import { Entry } from './Glossary.js';
import { saf } from './Run.js';
import { Term } from './Interpreter.js';

type AnyObject = { [key: string]: any };

/**
 * The Converter class handles the conversion of a glossary entry to a specific format.
 * This conversion happens according to a string that is supplied in `template`.
 * An entry is converted by calling the `convert` method with the corresponding entry and a matching term.
 * Helper functions are registered with Handlebars to allow for more complex conversions.
 */
export class Converter {
      private type: string;
      private template: string;

      public constructor({ template }: { template: any }) {
            // map of default templates for each type
            const map: { [key: string]: string } = {
                  html: '<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}">{{showtext}}</a>',
                  essif: '<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}" title="{{capFirst term}}: {{noRefs glossaryText type="markdown"}}">{{showtext}}</a>',
                  markdown: '[{{showtext}}]({{navurl}}{{#trait}}#{{/trait}}{{trait}})',
            };

            // register helper functions with Handlebars
            Handlebars.registerHelper('noRefs', noRefsHelper);
            Handlebars.registerHelper('capFirst', capFirstHelper);
            Handlebars.registerHelper('ifValue', ifValueHelper);
            Handlebars.registerHelper('localize', localizeHelper);

            let key = template.toLowerCase();
            let exist = map.hasOwnProperty(key);
            // check if the template parameter is a key in the defaults map
            if (exist) {
                  this.type = key;
                  this.template = map[key];
            } else {
                  this.type = 'custom';
                  this.template = template;
            }
            log.info(`Using ${this.type} template: '${this.template}'`)
      }

      convert(entry: Entry, term: Term): string {
            // Evaluate the properties inside the entry object
            const evaluatedEntry: AnyObject = {};
            for (const [key, value] of Object.entries(entry)) {
                  if (typeof value === 'string') {
                        evaluatedEntry[key] = evaluateExpressions(value, { ...entry, term });
                  } else {
                        evaluatedEntry[key] = value;
                  }
            }

            const template = Handlebars.compile(this.template, {noEscape: true, compat: true});

            return template({ ...evaluatedEntry, ...term });
      }

      getType(): string {
            return this.type;
      }
}

/**
 * Helper function to remove references or links from a string (according to the specified type)
 * @param text - The string to be processed
 * @param options - The options to be used in the processing
 * @returns The processed string
 */
function noRefsHelper(this: any, text: string, options: any) {
      // handle empty strings
      if (Handlebars.Utils.isEmpty(text)) {
            return text;
      }

      // default to interpreter if no type is specified
      let type = ['interpreter']
      // Split the option hash string of `type` into an array of types
      if (!Handlebars.Utils.isEmpty(options.hash.type)) {
            type = options.hash.type.split(',').map((element: string) => {
                  return element.trim();
            });
      }

      let regex: RegExp;

      type.forEach((element: string) => {
            // switch on element of type to determine which regex to use
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
                  // iterate over each match found in the text string
                  for (const match of matches) {
                        const term: Term = interpreter!.interpret(match, saf);
            
                        if (term.showtext) {
                              // replace the match with the showtext property and make the first letter(s) capitalized
                              text = text.replace(match[0], capFirstHelper(term.showtext!));
                        }
                  }
            }
      });

      return text;
}

/**
 * Helper function to capitalize the first letter of every word in a string
 * @param text - The string to be capitalized
 * @returns The capitalized string
 */
function capFirstHelper(text: string) {
      if (Handlebars.Utils.isEmpty(text)) {
            return text;
      }

      // the first character of every word separated by spaces will be capitalized
      const words = text.split(' ');
      const capitalizedWords = words.map((word) =>
            word.charAt(0).toUpperCase() + word.slice(1)
      );
      return capitalizedWords.join(' ');
}

/**
 * Helper function to compare two values in a Handlebars `ifValue` block
 * @param conditional - The first value to compare
 * @param options - The second value to compare
 * @returns The result of the comparison
 */
function ifValueHelper(this: any, conditional: any, options: any) {
      if (conditional == options.hash.equals) {
            return options.fn(this);
      } else {
            return options.inverse(this);
      }
};

/**
 * Helper function to localize URLs (remove the host and protocol)
 * If the host of the parsed `url` is the same as website's, then the localized path is created
 * @param url - The URL to be processed
 */
function localizeHelper(url: string) {
      try {
            const parsedURL = new URL(url);
            const parsedWebsite = new URL(saf.scope.website);
            if (parsedURL.host === parsedWebsite.host) {
                  url = parsedURL.pathname;
            }
      } catch (error) {
            // do nothing
      } finally {
            return url;
      }
}

/**
 * Helper function to evaluate Handlebars expressions inside MRG Entry properties
 * @param input - The string to be evaluated
 * @param data - The data to be used in the evaluation
 * @returns The evaluated string
 */
function evaluateExpressions(input: string, data: AnyObject): string {
      const template = Handlebars.compile(input, {noEscape: true, compat: true});
      return template(data);
}
