import { MRG, Handlebars, type TermError } from "@tno-terminology-design/utils"
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

  public constructor({ template }: { template: string }) {
    // map of default templates for each type
    // If you add/remove mappings, please also edit the corresponding `.option` statement in `Run.ts`, and the documentation at `tno-terminology-design/tev2-specifications/docs/specs`.
    const map: Record<string, string> = {
      default: "{{term}}{{termType}}", // used by the sorter
      glossaryterm: "{{noRefs glossaryTerm}}{{term}}{{termType}}", // used by the sorter
      "markdown-table-row":
        "| [{{#if glossaryTerm}}{{noRefs glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}}) | {{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}} |\n",
      "markdown-abbr-table-row":
        "{{#if glossaryAbbr}}| [{{glossaryAbbr}}]({{localize navurl}}) | See: [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{termid}}@) |\n{{/if}}",
      "markdown-section-2":
        "## [{{#if glossaryTerm}}{{noRefs glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}})\n\n{{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}}\n\n",
      "markdown-abbr-section-2":
        "{{#if glossaryAbbr}}## [{{glossaryAbbr}}]({{localize navurl}})\n\nSee: [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{termid}}@)\n\n{{/if}}",
      "markdown-section-3":
        "### [{{#if glossaryTerm}}{{noRefs glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}})\n\n{{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}}\n\n",
      "markdown-abbr-section-3":
        "{{#if glossaryAbbr}}### [{{glossaryAbbr}}]({{localize navurl}})\n\nSee: [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{termid}}@)\n\n{{/if}}"
    }

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
