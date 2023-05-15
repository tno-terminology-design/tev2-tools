import { Logger } from "tslog";
import { Converter } from "./Converter.js";

export class MarkdownConverter implements Converter {
      private log = new Logger();
      public constructor() { }

      getType(): string {
            return "Markdown";
      }

      public convert(glossary: Map<string, string>, properties: Map<string, string>): string {
            var markdownOut: string = "";
            this.log.info(glossary, properties)

            const match = `${properties.get("term")}@${properties.get("scopetag")}:${properties.get("vsntag")}`
            this.log.trace(match)

            if (properties.get("scopetag") == "default") {
                  if (properties.get("vsntag") == "latest") {
                        var term: string = glossary.get(properties.get("term")!)!;
                        if (properties.get("trait")) {
                              markdownOut = `[${properties.get("showtext")}](${term}#${properties.get("trait")})`;
                        } else {
                              markdownOut = `[${properties.get("showtext")}](${term})`;
                        }
                        this.log.info("The converted markdown term is: " + markdownOut)
                  } else {
                        this.log.error(`No access to version '${properties.get("vsntag")}' of ' ${properties.get("scopetag")}'`);
                        return markdownOut;
                  }

            } else {
                  this.log.error(`No access to scope '${properties.get("scopetag")}'`);
                  return markdownOut;
            }
            return markdownOut;
      }


}