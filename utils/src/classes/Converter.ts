import { MRG, Handlebars, type TermError, type Reference, Interpreter } from "../index.js";

export interface Profile {
  int: Interpreter
  ref: Reference
  entry?: MRG.Entry
  mrg?: MRG.Type; // Update to use the full MRG type
  err?: TermError
}

/**
 * The Converter class handles the conversion of a Profile object to a specific format.
 * This conversion happens according to a string that is supplied in `template`.
 * A Profile is converted by calling the `convert` method.
 * Handlebars is called from the @tno-terminology-design/utils package.
 */
export abstract class Converter {
  public type: string
  public template: string
  public name: string
  public n: number

  static instances: Converter[] = []

  public constructor({
    template,
    name,
    mapping,
    n
  }: {
    template: string
    name: string
    mapping: Record<string, string>
    n?: number
  }) {
    this.name = name
    this.n = n ?? 0

    const map = mapping
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
