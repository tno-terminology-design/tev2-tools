import { type HelperOptions } from "handlebars";

/**
 * Helper function to compare two values for equality in Handlebars.
 * @param value1 - The first value to compare.
 * @param value2 - The second value to compare.
 * @returns `true` if the values are equal, `false` otherwise.
 */
export function eq(value1: unknown, value2: unknown): boolean {
  return value1 === value2;
}

/**
 * Here is how it works:
 *  {{#eq someValue "expectedValue"}}
 *    <!-- This block will render if someValue equals "expectedValue" -->
 *    This is the true block.
 *  {{else}}
 *    <!-- This block will render if someValue does not equal "expectedValue" -->
 *    This is the false block.
 *  {{/eq}}
 */