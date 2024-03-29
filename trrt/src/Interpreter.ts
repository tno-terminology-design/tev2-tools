import { regularize, mappings } from "@tno-terminology-design/utils"

export interface TermRef {
  showtext: string
  type?: string
  term?: string
  trait?: string
  scopetag?: string
  vsntag?: string
  [key: string]: string
}

/**
 * The Interpreter class handles the interpretation of a term reference.
 * This interpretation happens according to a string that is supplied in `regex`.
 * A term is interpreted by calling the `interpret` method with the corresponding match.
 * The `interpret` method returns a TermRef object.
 */
export class Interpreter {
  public type: string
  public regex: RegExp

  public constructor({ regex }: { regex: string }) {
    const map = mappings.trrt_interpreter_map
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

  interpret(match: RegExpMatchArray): TermRef {
    if (match.groups === undefined) {
      throw new Error("Error in evaluating regex pattern: No groups provided")
    }

    for (const key in match.groups) {
      // Replace empty strings with null
      if (match.groups[key] === "") {
        match.groups[key] = null
      }
      // Regularize the machine processable values
      if (["type", "term", "scopetag", "vsntag"].includes(key)) {
        match.groups[key] = regularize(match.groups[key])
      }
    }

    return {
      ...match.groups,
      showtext: match.groups.showtext
    }
  }
}
