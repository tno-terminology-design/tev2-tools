import Handlebars, { type HelperOptions } from "handlebars"
import { log } from "@tno-terminology-design/utils"
import { resolver } from "./Run.js"
import { type Entry, type Terminology } from "@tno-terminology-design/utils"
import { type Term } from "./Interpreter.js"

/**
 * The Converter class handles the conversion of a glossary entry to a specific format.
 * This conversion happens according to a string that is supplied in `template`.
 * An entry is converted by calling the `convert` method with the corresponding entry and a matching term.
 * Helper functions are registered with Handlebars to allow for more complex conversions.
 */
export class Converter {
  private readonly type: string
  private readonly template: string

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

    // register helper functions with Handlebars
    Handlebars.registerHelper("noRefs", noRefsHelper) // Remove all TermRefs
    Handlebars.registerHelper("capFirst", capFirstHelper) // Capitalize first character
    Handlebars.registerHelper("ifValue", ifValueHelper) // ???
    Handlebars.registerHelper("localize", localizeHelper) // Replace link with local equivalent

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
    log.info(`Using ${this.type} template: '${this.template.replace(/\n/g, "\\n")}'`)
  }

  convert(entry: Entry, term: Term, terminology?: Terminology): string {
    // Evaluate the properties inside the entry object
    const evaluatedEntry: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(entry)) {
      if (typeof value === "string") {
        evaluatedEntry[key] = evaluateExpressions(value, { ...entry, term })
      } else {
        evaluatedEntry[key] = value
      }
    }

    const template = Handlebars.compile(this.template, { noEscape: true, compat: true })

    const output = template({ mrg: { terminology: terminology }, ...evaluatedEntry, ...term })
    if (output === "") {
      throw new Error(`resulted in an empty string, check the converter template`)
    }
    return output
  }

  getType(): string {
    return this.type
  }
}

/**
 * Helper function to remove references or links from a string (according to the specified type)
 * @param text - The string to be processed
 * @param options - The options to be used in the processing
 * @returns The processed string
 */
function noRefsHelper(text: string, options: HelperOptions): string {
  // handle empty strings
  if (Handlebars.Utils.isEmpty(text)) {
    return text
  }

  // default to interpreter if no type is specified
  let type = ["interpreter"]
  // Split the option hash string of `type` into an array of types
  if (!Handlebars.Utils.isEmpty(options.hash.type)) {
    type = options.hash.type.split(",").map((element: string) => {
      return element.trim()
    })
  }

  let regex: RegExp

  type.forEach((element: string) => {
    // switch on element of type to determine which regex to use
    switch (element.toLowerCase()) {
      case "interpreter":
        regex = resolver.interpreter.getRegex()
        break
      case "html":
        regex = /<a\b[^>]*?>(?<showtext>.*?)<\/a>/g
        break
      case "markdown":
        regex = /\[(?<showtext>[^\]]+)\]\((?:[^)]+)\)/g
        break
      default:
        // assume the element is a custom regex
        regex = new RegExp(element.replace(/^\/|\/[a-z]*$/g, ""), "g")
    }

    const matches = Array.from(text.matchAll(regex))

    if (matches.length > 0) {
      // iterate over each match found in the text string
      for (const match of matches) {
        const term: Term = resolver.interpreter.interpret(match, resolver.saf)

        if (term.showtext != null) {
          // replace the match with the showtext property and make the first letter(s) capitalized
          text = text.replace(match[0], capFirstHelper(term.showtext))
        }
      }
    }
  })

  return text
}

/**
 * Helper function to capitalize the first letter of every word in a string
 * @param text - The string to be capitalized
 * @returns The capitalized string
 */
function capFirstHelper(text: string): string {
  if (Handlebars.Utils.isEmpty(text)) {
    return text
  }

  // the first character of every word separated by spaces will be capitalized
  const words = text.split(" ")
  const capitalizedWords = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  return capitalizedWords.join(" ")
}

/**
 * Helper function to compare two values in a Handlebars `ifValue` block
 * @param conditional - The first value to compare
 * @param options - The second value to compare
 * @returns The result of the comparison
 */
function ifValueHelper(this: unknown, conditional: unknown, options: HelperOptions): string {
  if (conditional === options.hash.equals) {
    return options.fn(this)
  } else {
    return options.inverse(this)
  }
}

/**
 * Helper function to localize URLs (remove the host and protocol)
 * If the host of the parsed `url` is the same as website's, then the localized path is created
 * @param url - The URL to be processed
 */
function localizeHelper(url: string): string {
  try {
    const parsedURL = new URL(url)
    const parsedWebsite = new URL(resolver.saf.scope.website)
    if (parsedURL.host === parsedWebsite.host) {
      url = parsedURL.pathname
    }
  } catch (error) {
    // do nothing
  }
  return url
}

/**
 * Helper function to evaluate Handlebars expressions inside MRG Entry properties
 * @param input - The string to be evaluated
 * @param data - The data to be used in the evaluation
 * @returns The evaluated string
 */
function evaluateExpressions(input: string, data: Record<string, unknown>): string {
  const template = Handlebars.compile(input, { noEscape: true, compat: true })
  return template(data)
}
