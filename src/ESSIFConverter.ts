import { Converter } from "./Converter.js";
import { Entry } from "./Glossary.js";

import path = require('path');

export class ESSIFConverter implements Converter {
      public constructor() {}
      
      getType(): string {
            return "ESSIF";
      }

      public convert(entry: Entry, term: Map<string, string>): string {
            var esiffOut: string = "";

            // Generate the 'converted' representation based on the matching entry
            if (entry.website && entry.navurl) {
                  esiffOut = `<a href="${path.join(entry.website, entry.navurl)}" title="${entry.glossaryText}">${term.get("showtext")}</a>`

                  if (term.get("trait") !== undefined) {
                        // Add the trait as an anchor link if available in entry heading id's
                        if (entry.headingids?.includes(term.get("trait")!)) {
                              esiffOut = `<a href="${path.join(entry.website, entry.navurl)}#${term.get("trait")}" title="${entry.glossaryText}">${term.get("showtext")}</a>`
                        }
                  }
            }

            return esiffOut;
      }
}
