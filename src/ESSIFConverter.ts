import { Converter } from "./Converter.js";
import { Output } from "./Glossary.js";

import path = require('path');

export class ESSIFConverter implements Converter {
      public constructor() {}
      
      getType(): string {
            return "ESSIF";
      }

      public convert(glossary: Output, properties: Map<string, string>): string {
            var esiffOut: string = "";

            // Find the matching entry in the glossary based on the term and scopetag
            let match = glossary.entries.find(entry =>
                  entry.term === properties.get("term") &&
                  entry.scopetag === properties.get("scopetag")
            );
            
            // Generate the ESSIF HTML representation based on the matching entry
            if (match?.website && match?.navurl) {
                  if (properties.get("trait")) {
                        // Add the trait as an anchor link if available
                        esiffOut = `<a href="${path.join(match.website, match.navurl)}#${properties.get("trait")}" title="${match.glossaryText}">${properties.get("showtext")}</a>`
                  } else {
                        esiffOut = `<a href="${path.join(match.website, match.navurl)}" title="${match.glossaryText}">${properties.get("showtext")}</a>`
                  }

            }

            return esiffOut;
      }
}
