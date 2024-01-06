import { MRG, Handlebars } from "@tno-terminology-design/utils"
import { Interpreter, type Term } from "./Interpreter.js"

/**
 * The Converter class handles the conversion of a glossary entry to a specific format.
 * This conversion happens according to a string that is supplied in `template`.
 * An entry is converted by calling the `convert` method with the corresponding entry and a matching term.
 * Helper functions are registered with Handlebars to allow for more complex conversions.
 */
export class Converter {
  public type: string
  public template: string

  public constructor({ template }: { template: string }) {
    // map of default templates for each type
    // If you add/remove mappings, please also edit the corresponding `.option` statement in `Run.ts`, and in the repo-file `tno-terminology-design/tev2-specifications/docs/spec-files/90-configuration-file.md`.
    const map: Record<string, string> = {
      "markdown-link": "[{{showtext}}]({{navurl}}{{#if trait}}#{{trait}}{{/if}})",
      "html-link": '<a href="{{navurl}}{{#if trait}}#{{trait}}{{/if}}">{{showtext}}</a>',
      "html-hovertext-link":
        '<a href="{{localize navurl}}{{#if trait}}#{{trait}}{{/if}}" title="{{#if hoverText}}{{hoverText}}{{else}}{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}: {{noRefs glossaryText type="markdown"}}{{/if}}">{{showtext}}</a>',
      // 'html-hovertext-link': '<a href="{{localize navurl}}{{#if trait}}#{{trait}}{{/if}}" title="{{#if hoverText}}{{noRefs hoverText}}{{else}}{{#if glossaryTerm}}{{noRefs glossaryTerm}}{{else}}{{capFirst term}}{{/if}}: {{noRefs glossaryText type="markdown"}}{{/if}}">{{showtext}}</a>',
      "html-glossarytext-link":
        '<a href="{{localize navurl}}{{#if trait}}#{{trait}}{{/if}}" title="{{capFirst term}}: {{noRefs glossaryText type="markdown"}}">{{showtext}}</a>'
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

  convert(entry: MRG.Entry, term: Term, terminology?: MRG.Terminology, interpreter?: Interpreter): string {
    // Evaluate the properties inside the entry object
    const evaluatedEntry: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(entry)) {
      if (typeof value === "string") {
        const template = Handlebars.compile(value, { noEscape: true, compat: true })
        evaluatedEntry[key] = template({ mrg: { terminology: terminology }, interpreter, ...entry, ...term })
      } else {
        evaluatedEntry[key] = value
      }
    }

    const template = Handlebars.compile(this.template, { noEscape: true, compat: true })

    const output = template({ mrg: { terminology: terminology }, interpreter, ...evaluatedEntry, ...term })
    if (output === "") {
      throw new Error(`resulted in an empty string, check the converter template`)
    }
    return output
  }
}
