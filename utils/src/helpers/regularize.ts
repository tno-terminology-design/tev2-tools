/**
 * Turn normal, human readable, text into regularized texts.
 * @param input - The text to be regularized
 * @returns The regularized text
 */
export function regularize(input: string): string {
  try {
    // Convert the text to lowercase
    let process = input.toLowerCase()

    // Remove all characters at the beginning that do not match regex [a-z]
    process = process.replace(/^[^a-z]+/, "")

    // Replace all sequences of characters that may not appear in regularized text with `-`
    process = process.replace(/[^a-z-_0-9]/g, "-")

    // Replace all sequences of `-` characters with a single `-`
    process = process.replace(/-{2,}/g, "-")

    // Remove leading and/or trailing - characters
    return process.replace(/^-|-$/g, "")
  } catch (error) {
    return input
  }
}
