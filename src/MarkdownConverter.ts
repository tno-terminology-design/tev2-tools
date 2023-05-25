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

            // Generate the Markdown representation based on the matching entry
            if (entry.website && entry.navurl) {
                  if (term.get("trait") && entry.headingids) {
                        // Add the trait as an anchor link if available in entry heading id's
                        if (term.get("trait")! in entry.headingids) {
                              markdownOut = `[${term.get("showtext")}](${path.join(entry.website, entry.navurl)}#${term.get("trait")})`
                        }
                  } else {
                        markdownOut = `[${term.get("showtext")}](${path.join(entry.website, entry.navurl)})`
                  }
            }

            return markdownOut;
      }
}
