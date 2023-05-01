export interface Interpreter {
      interpret(match: RegExpMatchArray): Map<string,string>;
      getGlobalTermRegex() : RegExp;
      getLocalTermRegex() : RegExp;
      getType() :  string;
}