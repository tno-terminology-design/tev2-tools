import { regularize } from "../index.js"

export interface Reference {
  [key: string]: string
}

/**
 * The Interpreter class handles the interpretation of a reference.
 * This interpretation happens according to a string that is supplied in `regex`.
 * An reference is interpreted by calling the `interpret` method with the corresponding match.
 * The `interpret` method returns a Reference object.
 */
export abstract class Interpreter {
  public type: string
  public regex: RegExp

  public constructor({ regex, mapping }: { regex: string; mapping: Record<string, RegExp> }) {
    const map = mapping
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

  interpret(match: RegExpMatchArray, regularization?: string[]): Reference {
    if (match.groups == undefined) {
      throw new Error("Error in evaluating regex pattern: no groups provided")
    }

    for (const key in match.groups) {
      // Replace empty strings with null
      if (match.groups[key] === "") {
        match.groups[key] = null
      }
      // Regularize the machine processable values
      if (regularization?.includes(key)) {
        match.groups[key] = regularize(match.groups[key])
      }
    }

    return {
      ...match.groups
    }
  }
}
