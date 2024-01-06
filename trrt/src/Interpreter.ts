import { SAF } from "@tno-terminology-design/utils"

export interface Term {
  showtext: string
  type?: string
  id: string
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
        /(?:(?<=[^`\\])|^)\[(?=[^@\]]+\]\([#:a-z0-9_-]*@[:a-z0-9_-]*\))(?<showtext>[^\n\]@]+)\]\((?:(?:(?<type>[a-z0-9_-]*):)?)(?:(?<id>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]*))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]*))?\)/g,
      basic:
        /(?:(?<=[^`\\])|^)\[(?=[^@\]]+\]\([#:a-z0-9_-]*@[:a-z0-9_-]*\))(?<showtext>[^\n\]@]+)\]\((?:(?:(?<type>[a-z0-9_-]*):)?)(?:(?<id>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]*))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]*))?\)/g,
      alt: /(?:(?<=[^`\\])|^)\[(?=[^@\]]+@[:a-z0-9_-]*\](?:\([#:a-z0-9_-]+\))?)(?<showtext>[^\n\]@]+?)@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]*?))?\](?:\((?:(?:(?<type>[a-z0-9_-]+):)?)(?<id>[a-z0-9_-]*)(?:#(?<trait>[a-z0-9_-]*?))?\))/g
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

  interpret(match: RegExpMatchArray, saf: SAF.Type): Term {
    if (match.groups === undefined) {
      throw new Error("Error in evaluating regex pattern: No groups provided")
    }

    return {
      ...match.groups,
      showtext: match.groups.showtext,
      id:
        match.groups.id?.length > 0
          ? match.groups.id
          : match.groups.showtext
              .toLowerCase()
              .replace(/['()]+/g, "")
              .replace(/[^a-z0-9_-]+/g, "-"),
      type: match.groups.type || saf.scope.defaulttype,
      trait: match.groups.trait,
      scopetag: match.groups.scopetag || saf.scope.scopetag,
      vsntag: match.groups.vsntag
    }
  }
}
