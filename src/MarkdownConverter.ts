import { Logger } from "tslog";
import { Converter } from "./Converter.js";

export class MarkdownConverter implements Converter {
      private log = new Logger();
      public constructor() { }

      getType(): string {
            return "Markdown";
      }

      public convert(glossary: Map<string, string>, properties: Map<string, string>): string {
            // trait (optional)
            // trait identifies a particular kind of descriptive text that is associated with the knowledge artifact. If specified, it must be one of the elements in the list of headingid's as specified in the headingids field of the MRG entry. If omitted, the preceding #-character should also be omitted
            var markdownOut: string = "";
            this.log.info(glossary, properties)

            const match = `${properties.get("term")}#${properties.get("trait")}@${properties.get("scopetag")}:${properties.get("vsntag")}`
            this.log.trace(match)

            if (properties.get("scopetag") == "default") {
                  if (properties.get("vsntag") == "latest") {
                        var term: string = glossary.get(properties.get("term")!)!;
                        if (properties.get("trait") != "default") {
                              markdownOut = `[${properties.get("showtext")}](${term}#${properties.get("trait")})`;
                        } else {
                              markdownOut = `[${properties.get("showtext")}](${term})`;
                        }
                        this.log.info("The converted markdown term is: " + markdownOut)
                  } else {
                        this.log.error(`No access to version '${properties.get("vsntag")}' of ' ${properties.get("scopetag")}'`);
                        return markdownOut;
                        // TODO go back and get the correct glossary   
                  }

            } else {
                  this.log.error(`No access to scope '${properties.get("scopetag")}'`);
                  return markdownOut;
                  // TODO go back and get the correct glossary
            }
            return markdownOut;
      }


}