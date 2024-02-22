import { MRG, Handlebars, mappings, type TermError } from "@tno-terminology-design/utils"
import { Interpreter, type MRGRef } from "./Interpreter.js"

export interface Profile {
  int: Interpreter
  ref: MRGRef
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

  public constructor({ template, n, sorter = false }: { template: string; n?: number; sorter?: boolean }) {
    if (sorter) {
      this.name = "sorter"
    } else {
      this.n = n ?? 0
      this.name = `converter${this.n === -1 ? "[error]" : this.n > 1 ? `[${this.n}]` : ""}`
    }

    const map = sorter ? mappings.hrgt_sorter_map : mappings.hrgt_converter_map
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
      const template = Handlebars.compile(this.template, { noEscape: true, compat: true })

      return template({ ...profile.entry, ...profile })
    } catch (err) {
      throw new Error(
        `unexpected results from using '${this.type}' ${this.name} template, check that the template syntax is correct: ${err.message}`
      )
    }
  }

  /**
   * The blank template can be compared to a regular output to check if any expressions were filled.
   */
  getBlank(): string {
    const template = Handlebars.compile(this.template, { noEscape: true, compat: true })

    return template({})
  }
}
