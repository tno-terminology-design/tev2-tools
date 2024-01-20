import Handlebars, { type HelperOptions } from "handlebars"

Handlebars.registerHelper("noRefs", noRefs)
Handlebars.registerHelper("capFirst", capFirst)
Handlebars.registerHelper("ifValue", ifValue)
Handlebars.registerHelper("localize", localize)

export { Handlebars }

interface env {
  mrg: {
    website: string
  }
  int: {
    regex: RegExp
  }
}

// int: Interpreter
// ref: MRGRef
// entry: MRG.Entry
// mrg: MRG.Terminology
// err?: { filename: string; line: number; pos: number; cause?: string }

/**
 * Helper function to capitalize the first letter of every word in a string
 * @param text - The string to be capitalized
 * @returns The capitalized string
 */
export function capFirst(text: string): string {
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
export function ifValue(this: unknown, conditional: unknown, options: HelperOptions): string {
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
export function localize(this: env, url: string): string {
  try {
    const parsedURL = new URL(url)
    const parsedWebsite = new URL(this.mrg.website)
    if (parsedURL.host === parsedWebsite.host) {
      url = parsedURL.pathname
    }
  } catch (error) {
    // do nothing
  }
  return url
}

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
