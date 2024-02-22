import { MRG, Handlebars, type TermError, mappings } from "@tno-terminology-design/utils"
import { Interpreter, type TermRef } from "./Interpreter.js"

export interface Profile {
  int: Interpreter
  ref: TermRef
  entry?: MRG.Entry
  mrg?: MRG.Terminology
  err?: TermError
}

/**
 * The Converter class handles the conversion of a Profile object to a specific format.
 * This conversion happens according to a string that is supplied in `template`.
 * A Profile is converted by calling the `convert` method.
 * Handlebars is called from the @tno-terminology-design/utils package.
 */
export class Converter {
  public type: string
  public template: string
  public n: number
  public name: string

  static instances: Converter[] = []

  public constructor({ template, n }: { template: string; n?: number }) {
    this.n = n ?? 0
    this.name = `converter${this.n === -1 ? "[error]" : this.n > 1 ? `[${this.n}]` : ""}`

    const map = mappings.trrt_converter_map
    const key = template.toLowerCase()
    const exist = Object.prototype.hasOwnProperty.call(map, key)
    // check if the template parameter is a key in the defaults map
    if (exist) {
      this.type = key
      this.template = map[key]
    } else {
      this.type = "custom"
      this.template = template.replace(/\\n/g, "\n")
    }
    Converter.instances.push(this)
  }

  convert(profile: Profile): string {
    try {
      if (profile.entry) {
        // Evaluate the string properties inside the entry object
        for (const [key, value] of Object.entries(profile.entry)) {
          if (typeof value === "string") {
            const template = Handlebars.compile(value, { noEscape: true, compat: true })
            profile.entry[key as keyof typeof profile.entry] = template({ ...profile.entry, ...profile })
          }
        }
      }

      const template = Handlebars.compile(this.template, { noEscape: true, compat: true })
      const output = template({ ...profile.entry, ...profile })

      if (output === "") {
        throw new Error(`resulted in an empty string, check the ${this.name} template`)
      }
      return output
    } catch (err) {
      throw new Error(
        `unexpected results from using '${this.type}' ${this.name} template, check that the template syntax is correct: ${err.message}`
      )
    }
  }
}
