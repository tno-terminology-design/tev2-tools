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

            let match = glossary.entries.find(entry =>
                  entry.term === properties.get("term") &&
                  entry.scopetag === properties.get("scopetag")
            );

            if (match?.website && match?.navurl) {
                  esiffOut = `<a href="${path.join(match.website, match.navurl)}" title="${match.glossaryText}">${properties.get("showtext")}</a>`
            }

            return esiffOut;
      }
}
