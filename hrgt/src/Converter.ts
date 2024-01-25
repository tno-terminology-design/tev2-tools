import { MRG, SAF, Handlebars } from "@tno-terminology-design/utils"
import { Interpreter, type MRGRef } from "./Interpreter.js"

export interface Profile {
  int: Interpreter
  ref: MRGRef
  entry: MRG.Entry
  mrg: MRG.Terminology
  err?: { filename: string; line: number; pos: number; cause?: string }
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
  static saf: SAF.Type

  public constructor({ template }: { template: string }) {
    // If you add/remove mappings, please also edit the corresponding `.option` statement in `Run.ts`, and the documentation at `tno-terminology-design/tev2-specifications/docs/specs`.
    // map of default templates for each type
    const map: Record<string, string> = {
      default: "{{term}}{{termType}}", // used by the sorter
      glossaryterm: "{{glossaryTerm}}{{term}}{{termType}}", // used by the sorter
      "markdown-table-row":
        "| [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}}) | {{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}} |\n",
      "markdown-abbr-table-row":
        "{{#if glossaryAbbr}}| [{{glossaryAbbr}}]({{localize navurl}}) | See: [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{termid}}@) |\n{{/if}}",
      "markdown-section-2":
        "## [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}})\n\n{{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}}\n\n",
      "markdown-abbr-section-2":
        "{{#if glossaryAbbr}}## [{{glossaryAbbr}}]({{localize navurl}})\n\nSee: [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{termid}}@)\n\n{{/if}}",
      "markdown-section-3":
        "### [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}})\n\n{{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}}\n\n"
      "markdown-abbr-section-3":
        "{{#if glossaryAbbr}}### [{{glossaryAbbr}}]({{localize navurl}})\n\nSee: [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{termid}}@)\n\n{{/if}}",
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
  }

  convert(profile: Profile): string {
    const template = Handlebars.compile(this.template, { noEscape: true, compat: true })

    return template({ ...profile.entry, ...profile })
  }

  /**
   * The blank template can be compared to a regular output to check if any expressions were filled.
   */
  getBlank(): string {
    const template = Handlebars.compile(this.template, { noEscape: true, compat: true })

    return template({})
  }
}
