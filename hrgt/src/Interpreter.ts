import { type Reference, mappings, Interpreter as BaseInterpreter } from "@tno-terminology-design/utils"

export interface MRGRef extends Reference {
  hrg?: string
  converter?: string
  sorter?: string
  scopetag?: string
  vsntag?: string
}

export class Interpreter extends BaseInterpreter {
  public constructor({ regex }: { regex: string }) {
    super({ regex, mapping: mappings.hrgt_interpreter_map })
  }

  interpret(match: RegExpMatchArray): MRGRef {
    const hrg: RegExpMatchArray = match.groups.hrg?.match(/(?:@)?(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]*))?/)
    match.groups.scopetag = hrg?.groups.scopetag
    match.groups.vsntag = hrg?.groups.vsntag

    return super.interpret(match, ["scopetag", "vsntag"])
  }
}
