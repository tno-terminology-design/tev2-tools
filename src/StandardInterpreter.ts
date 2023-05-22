import { Logger } from "tslog";
import { Interpreter } from "./Interpreter.js";

export class StandardInterpreter implements Interpreter {
      private log = new Logger();
      private termRegex: RegExp = /(?<=^|[^`\\])\[(?<showtext>[^\n\]@]+)\]\((?:(?<term>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]+))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+))?\)/g;
      public constructor() { }

      getType(): string {
            return "Standard";
      }

      interpret(match: RegExpMatchArray): Map<string, string> {
            var termProperties: Map<string, string> = new Map();

            if (match.groups != undefined) {
                  termProperties.set("showtext", match.groups.showtext);
                  termProperties.set("term", match.groups.term || match.groups.showtext.toLowerCase().replace(/[^A-Za-z_-]+/, "-"));
                  termProperties.set("trait", match.groups.trait);
                  termProperties.set("scopetag", match.groups.scopetag);
                  termProperties.set("vsntag", match.groups.vsntag);

                  this.log.trace(`Interpreted term ref: ${termProperties.get("term")} ${termProperties.get("scopetag")}`);
            }

            return termProperties;
      }

      public getTermRegex(): RegExp {
            return this.termRegex;
      }
}
