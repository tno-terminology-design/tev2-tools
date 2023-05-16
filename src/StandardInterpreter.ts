import { Logger } from "tslog";
import { Interpreter } from "./Interpreter.js";

export class StandardInterpreter implements Interpreter {
      private log = new Logger();
      private termRegexGlobal: RegExp = /(?<=^|[^`\\])\[(?<showtext>[^\n\]@]+)\]\((?:(?<term>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]+))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+))?\)/g;
      private termRegexLocal: RegExp = /(?<=^|[^`\\])\[(?<showtext>[^\n\]@]+)\]\((?:(?<term>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]+))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+))?\)/;
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
                  this.log.trace(`Interpreted term: ${termProperties.get("term")}`);
            }

            return termProperties;
      }

      public getGlobalTermRegex(): RegExp {
            return this.termRegexGlobal;
      }

      public getLocalTermRegex(): RegExp {
            return this.termRegexLocal;
      }
}
