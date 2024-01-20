import { MRG, Handlebars } from "@tno-terminology-design/utils"
import { Interpreter, type TermRef } from "./Interpreter.js"

export interface Profile {
  int: Interpreter
  ref: TermRef
  entry?: MRG.Entry
  mrg: MRG.Terminology
  err?: { filename: string; line: number; pos: number; cause?: string }
}

/**
 * The Converter class handles the conversion of a glossary entry to a specific format.
 * This conversion happens according to a string that is supplied in `template`.
 * An entry is converted by calling the `convert` method with the corresponding entry and a matching term.
 * Helper functions are registered with Handlebars to allow for more complex conversions.
 */
export class Converter {
  public type: string
  public template: string
  public n: number

  static instances: Converter[] = []

  public constructor({ template }: { template: string }) {
    // map of default templates for each type
    // If you add/remove mappings, please also edit the corresponding `.option` statement in `Run.ts`, and in the repo-file `tno-terminology-design/tev2-specifications/docs/spec-files/90-configuration-file.md`.
    const map: Record<string, string> = {
      "markdown-link": "[{{ref.showtext}}]({{entry.navurl}}{{#if ref.trait}}#{{ref.trait}}{{/if}})",
      "html-link": '<a href="{{entry.navurl}}{{#if ref.trait}}#{{ref.trait}}{{/if}}">{{ref.showtext}}</a>',
      "html-hovertext-link":
        '<a href="{{localize entry.navurl}}{{#if ref.trait}}#{{ref.trait}}{{/if}}" title="{{#if entry.hoverText}}{{entry.hoverText}}{{else}}{{#if entry.glossaryTerm}}{{entry.glossaryTerm}}{{else}}{{capFirst entry.term}}{{/if}}: {{noRefs entry.glossaryText type="markdown"}}{{/if}}">{{ref.showtext}}</a>',
      "html-glossarytext-link":
        '<a href="{{localize entry.navurl}}{{#if ref.trait}}#{{ref.trait}}{{/if}}" title="{{capFirst entry.term}}: {{noRefs entry.glossaryText type="markdown"}}">{{ref.showtext}}</a>'
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
    const n = this.n === -1 ? "[error]" : this.n > 0 ? `[${this.n}]` : ""

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
        throw new Error(`resulted in an empty string, check the converter${n} template`)
      }
      return output
    } catch (err) {
      throw new Error(
        `unexpected results from using '${this.type}' converter${n} template, check that the template syntax is correct: ${err.message}`
      )
    }
  }
}
