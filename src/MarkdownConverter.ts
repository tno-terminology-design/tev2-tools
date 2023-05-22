import { Converter } from "./Converter.js";
import { Output } from "./Glossary.js";

import path = require('path');

export class MarkdownConverter implements Converter {
      public constructor() { }

      getType(): string {
            return "Markdown";
      }

      public convert(glossary: Output, properties: Map<string, string>): string {
            var markdownOut: string = "";

            let match = glossary.entries.find(entry =>
                  entry.term === properties.get("term") &&
                  entry.scopetag === properties.get("scopetag")
            );

            if (match?.website && match?.navurl) {
                  if (properties.get("trait")) {
                        markdownOut = `[${properties.get("showtext")}](${path.join(match.website, match.navurl)}#${properties.get("trait")})`
                  } else {
                        markdownOut = `[${properties.get("showtext")}](${path.join(match.website, match.navurl)})`
                  }
            }

            return markdownOut;
      }
}
