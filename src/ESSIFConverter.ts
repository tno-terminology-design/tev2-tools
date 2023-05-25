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

            // Generate the HTTP representation based on the matching entry
            if (entry.website && entry.navurl) {
                  if (term.get("trait") && entry.headingids) {
                        // Add the trait as an anchor link if available in entry heading id's
                        if (term.get("trait")! in entry.headingids) {
                              esiffOut = `<a href="${path.join(entry.website, entry.navurl)}#${term.get("trait")}">${term.get("showtext")}</a>`
                        }
                  } else {
                        esiffOut = `<a href="${path.join(entry.website, entry.navurl)}">${term.get("showtext")}</a>`
                  }
            }

            return esiffOut;
      }
}
