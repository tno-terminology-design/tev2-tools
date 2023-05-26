import { Converter } from "./Converter.js";
import { Entry } from "./Glossary.js";

import path = require('path');

export class HTTPConverter implements Converter {
      public constructor() {}
      
      getType(): string {
            return "HTTP";
      }

      public convert(entry: Entry, term: Map<string, string>): string {
            var httpOut: string = "";

            // Generate the 'converted' representation based on the matching entry
            if (entry.website && entry.navurl) {
                  httpOut = `<a href="${path.join(entry.website, entry.navurl)}">${term.get("showtext")}</a>`

                  if (term.get("trait") !== undefined) {
                        // Add the trait as an anchor link if available in entry heading id's
                        if (entry.headingids?.includes(term.get("trait")!)) {
                              httpOut = `<a href="${path.join(entry.website, entry.navurl)}#${term.get("trait")}">${term.get("showtext")}</a>`
                        }
                  }
            }

            return httpOut;
      }
}
