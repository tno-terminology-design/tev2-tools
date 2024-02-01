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
