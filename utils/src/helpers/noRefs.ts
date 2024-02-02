import { type HelperOptions } from "handlebars"
import { env, Handlebars } from "../classes/Handlebars.js"
import { capFirst } from "./capFirst.js"

/**
 * Helper function to remove references or links from a string (according to the specified type)
 * @param text - The string to be processed
 * @param options - The options to be used in the processing
 * @returns The processed string
 */
export function noRefs(this: env, text: string, options: HelperOptions): string {
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
        regex = this.int.regex
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
        if (match.groups?.showtext != null) {
          // replace the match with the showtext property and make the first letter(s) capitalized
          text = text.replace(match[0], capFirst(match.groups.showtext))
        }
      }
    }
  })

  return text
}
