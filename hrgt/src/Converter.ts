import { MRG, SAF, Handlebars } from "@tno-terminology-design/utils"
import { type MRGRef } from "./Interpreter.js"

export class Converter {
  public type: string
  public template: string
  static saf: SAF.Type

  public constructor({ template }: { template: string }) {
    // If you add/remove mappings, please also edit the corresponding `.option` statement in `Run.ts`, and in the repo-file `tno-terminology-design/tev2-specifications/docs/spec-files/90-configuration-file.md`
    // map of default templates for each type
    const map: Record<string, string> = {
      default: "{{term}}{{termType}}",
      "markdown-table-row":
        "| [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}}) | {{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}} |\n",
      "markdown-section-2":
        "## [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}})\n\n{{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}}\n\n",
      // 'markdown-section-2': "## [{{#if glossaryTerm}}{{noRefs glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}})\n\n{{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}}\n\n",
      "markdown-section-3":
        "### [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}})\n\n{{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}}\n\n"
      // 'markdown-section-3': "### [{{#if glossaryTerm}}{{noRefs glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}})\n\n{{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}}\n\n"
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

  convert(entry: MRG.Entry, mrgref: MRGRef, terminology?: MRG.Terminology): string {
    const template = Handlebars.compile(this.template, { noEscape: true, compat: true })

    return template({ mrg: { terminology: terminology }, ...entry, ...mrgref })
  }

  getBlank(): string {
    const template = Handlebars.compile(this.template, { noEscape: true, compat: true })

    return template({})
  }
}
