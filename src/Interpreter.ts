export interface Interpreter {
      interpret(match: RegExpMatchArray): Map<string,string>;
      getTermRegex() : RegExp;
      getType() :  string;
}