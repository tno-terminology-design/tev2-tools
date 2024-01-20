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
 * The `interpret` method returns a map of the term properties.
 */
export class Interpreter {
  public type: string
  public regex: RegExp

  public constructor({ regex }: { regex: string }) {
    // If you add/remove mappings, please also edit the corresponding `.option` statement in `Run.ts`, and in the repo-file `tno-terminology-design/tev2-specifications/docs/spec-files/90-configuration-file.md`.
    const map: Record<string, RegExp> = {
      default:
        /(?:(?<=[^`\\])|^)\[(?=[^@\]]+\]\([#:a-z0-9_-]*@[:a-z0-9_-]*\))(?<showtext>[^\n\]@]+)\]\((?:(?:(?<type>[a-z0-9_-]*):)?)(?:(?<term>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]*))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]*))?\)/g,
      alt: /(?:(?<=[^`\\])|^)\[(?=[^@\]]+@[:a-z0-9_-]*\](?:\([#:a-z0-9_-]+\))?)(?<showtext>[^\n\]@]+?)@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]*?))?\](?:\((?:(?:(?<type>[a-z0-9_-]+):)?)(?<term>[a-z0-9_-]*)(?:#(?<trait>[a-z0-9_-]*?))?\))/g
    }

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
      if (match.groups[key] === "") {
        match.groups[key] = null
      }
    }

    return {
      ...match.groups,
      showtext: match.groups.showtext
    }
  }
}
