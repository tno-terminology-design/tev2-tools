import { mappings, Interpreter as BaseInterpreter, type Reference } from "@tno-terminology-design/utils"

export interface TermRef extends Reference {
  showtext: string
  type?: string
  term?: string
  trait?: string
  scopetag?: string
  vsntag?: string
}

export class Interpreter extends BaseInterpreter {
  public constructor({ regex }: { regex: string }) {
    super({ regex, mapping: mappings.trrt_interpreter_map })
  }

  interpret(match: RegExpMatchArray): TermRef {
    return { ...super.interpret(match, ["type", "term", "scopetag", "vsntag"]), showtext: match.groups.showtext }
  }
}
