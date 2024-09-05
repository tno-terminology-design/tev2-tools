import { type HelperOptions } from "handlebars";

/**
 * Helper function to perform various comparisons in a Handlebars `ifValue` block.
 * Supports: equals, notEqual, greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual, isNull, isTruthy, isFalsy.
 * @param conditional - The value to compare.
 * @param options - Options object containing the comparison criteria.
 * @returns The result of the comparison.
 */
export function ifValue(this: unknown, conditional: any, options: HelperOptions): string {
  const {
    equals,
    notEqual,
    greaterThan,
    greaterThanOrEqual,
    lessThan,
    lessThanOrEqual,
    isNull,
    isTruthy,
    isFalsy,
  } = options.hash;

  if (equals !== undefined && conditional === equals) {
    return options.fn(this);
  } else if (notEqual !== undefined && conditional !== notEqual) {
    return options.fn(this);
  } else if (greaterThan !== undefined && conditional > greaterThan) {
    return options.fn(this);
  } else if (greaterThanOrEqual !== undefined && conditional >= greaterThanOrEqual) {
    return options.fn(this);
  } else if (lessThan !== undefined && conditional < lessThan) {
    return options.fn(this);
  } else if (lessThanOrEqual !== undefined && conditional <= lessThanOrEqual) {
    return options.fn(this);
  } else if (isNull !== undefined && (conditional === null || conditional === undefined)) {
    return options.fn(this);
  } else if (isTruthy !== undefined && !!conditional) {
    return options.fn(this);
  } else if (isFalsy !== undefined && !conditional) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
}
