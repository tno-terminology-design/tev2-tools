import { Logger } from "tslog";
import { Converter } from "./Converter.js";
import { Output } from "./Glossary.js";

import path = require('path');

export class MarkdownConverter implements Converter {
      private log = new Logger();
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

            this.log.debug(match, properties)

            if (match?.website && match?.navurl) {
                  markdownOut = `[${properties.get("showtext")}](${path.join(match.website, match.navurl)}#${properties.get("trait")})`
            }


            // if (properties.get("scopetag") == "default") {
            //       if (properties.get("vsntag") == "latest") {
            //             var term: string = glossary.get(properties.get("term")!)!;
            //             if (properties.get("trait")) {
            //                   markdownOut = `[${properties.get("showtext")}](${term}#${properties.get("trait")})`;
            //             } else {
            //                   markdownOut = `[${properties.get("showtext")}](${term})`;
            //             }
            //             this.log.info("The converted markdown term is: " + markdownOut)
            //       } else {
            //             this.log.error(`No access to version '${properties.get("vsntag")}' of ' ${properties.get("scopetag")}'`);
            //             return markdownOut;
            //       }

            // } else {
            //       this.log.error(`No access to scope '${properties.get("scopetag")}'`);
            //       return markdownOut;
            // }

            this.log.debug(markdownOut)
            // if (markdownOut == "") {
            //       return `[${properties.get("showtext")}](${properties.get("term")})`
            // }
            return markdownOut;
      }
}
