import { Converter } from "./Converter";
import { Interpreter } from "./Interpreter"

export class AltInterpreter implements Interpreter {
      private termRegexGlobal = /(?<=[^`\\])\[(?=[^@\]]+@[:a-z0-9_-]*\](?:\([#a-z0-9_-]+\))?)(?<showtext>.+?)@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+?))?\](?<ref>\((?<id>[a-z0-9_-]*)(?:#(?<trait>[a-z0-9_-]+?))?\))?/g;

      private termRegexLocal = /(?<=[^`\\])\[(?=[^@\]]+@[:a-z0-9_-]*\](?:\([#a-z0-9_-]+\))?)(?<showtext>.+?)@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+?))?\](?<ref>\((?<id>[a-z0-9_-]*)(?:#(?<trait>[a-z0-9_-]+?))?\))?/;

      constructor() {}

      getType(): string {
            return "Alt";
      }

      interpret(match: RegExpMatchArray): Map<string, string> {
            var termProperties: Map<string, string> = new Map();
            // todo
            return termProperties;
      }

      getGlobalTermRegex(): RegExp {
            return this.termRegexGlobal;
      }

      getLocalTermRegex(): RegExp {
            return this.termRegexLocal;
      }


}