import { Converter } from "./Converter.js";
import { Entry } from "./Glossary.js";

import path = require('path');

export class MarkdownConverter implements Converter {
      public constructor() { }

      getType(): string {
            return "Markdown";
      }

      public convert(entry: Entry, term: Map<string, string>): string {
            var markdownOut: string = "";

            // Generate the 'converted' representation based on the matching entry
            if (entry.website && entry.navurl) {
                  markdownOut = `[${term.get("showtext")}](${path.join(entry.website, entry.navurl)})`
                  
                  if (term.get("trait") !== undefined) {
                        // Add the trait as an anchor link if available in entry heading id's
                        if (entry.headingids?.includes(term.get("trait")!)) {
                              markdownOut = `[${term.get("showtext")}](${path.join(entry.website, entry.navurl)}#${term.get("trait")})`
                        }
                  }
            }

            return markdownOut;
      }
}
