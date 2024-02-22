import { regularize, mappings } from "@tno-terminology-design/utils"

export interface MRGRef {
  hrg?: string
  converter?: string
  sorter?: string
  scopetag?: string
  vsntag?: string
  [key: string]: string
}

/**
 * The Interpreter class handles the interpretation of an MRG reference.
 * This interpretation happens according to a string that is supplied in `regex`.
 * An MRG reference is interpreted by calling the `interpret` method with the corresponding match.
 * The `interpret` method returns an MRGRef object.
 */
export class Interpreter {
  public type: string
  public regex: RegExp

  public constructor({ regex }: { regex: string }) {
    const map = mappings.hrgt_interpreter_map
    const key = regex.toString().toLowerCase()
    const exist = Object.prototype.hasOwnProperty.call(map, key)
    // Check if the regex parameter is a key in the defaults map
    if (exist) {
      this.type = key
      this.regex = map[key]
    } else {
      this.type = "custom"
      // Remove leading and trailing slashes, and flags
      this.regex = new RegExp(regex.replace(/^\/|\/[a-z]*$/g, ""), "g")
    }
  }

  interpret(match: RegExpMatchArray): MRGRef {
    if (match.groups == undefined) {
      throw new Error("Error in evaluating regex pattern: no groups provided")
    }

    const hrg: RegExpMatchArray = match.groups.hrg.match(/(?:@)?(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]*))?/)
    match.groups.scopetag = hrg.groups.scopetag
    match.groups.vsntag = hrg.groups.vsntag

    for (const key in match.groups) {
      // Replace empty strings with null
      if (match.groups[key] === "") {
        match.groups[key] = null
      }
      // Regularize the machine processable values
      if (["scopetag", "vsntag"].includes(key)) {
        match.groups[key] = regularize(match.groups[key])
      }
    }

    return {
      ...match.groups
    }
  }
}
