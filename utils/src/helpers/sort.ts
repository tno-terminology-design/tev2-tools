/**
 * Sort an array of strings alphabetically.
 * @param input - The array of strings to sort
 * @returns The sorted array
 */
export function sort(input: string[]): string[] {
  if (!Array.isArray(input)) {
    throw new Error("Input must be an array of strings.");
  }
  return input.slice().sort((a, b) => a.localeCompare(b));
}
