import { Converter } from "./Converter.js";
import { Interpreter } from "./Interpreter.js"

export class AltInterpreter implements Interpreter {
      private termRegex = /(?<=[^`\\])\[(?=[^@\]]+@[:a-z0-9_-]*\](?:\([#a-z0-9_-]+\))?)(?<showtext>.+?)@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+?))?\](?<ref>\((?<id>[a-z0-9_-]*)(?:#(?<trait>[a-z0-9_-]+?))?\))?/g;

      constructor() {}

      getType(): string {
            return "Alt";
      }

      interpret(match: RegExpMatchArray): Map<string, string> {
            var termProperties: Map<string, string> = new Map();
            // todo
            return termProperties;
      }

      getTermRegex(): RegExp {
            return this.termRegex;
      }


}