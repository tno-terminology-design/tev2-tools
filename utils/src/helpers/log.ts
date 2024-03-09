import { type HelperOptions } from "handlebars"
import { log as logger } from "../classes/Report.js"

export function log(...args: unknown[]) {
  const options: Partial<HelperOptions> = args[args.length - 1]
  args.pop()
  let level = undefined
  if (options.hash.level != null) {
    level = options.hash.level
  }
  logger.settings.minLevel = undefined // reset the log level

  if (level === "silent") {
    // temporarily up the log level to suppress the output of conversion related warnings
    logger.settings.minLevel = 5
  } else if (level === "silly") {
    logger.silly(...args)
  } else if (level === "trace") {
    logger.trace(...args)
  } else if (level === "debug") {
    logger.debug(...args)
  } else if (level === "info") {
    logger.info(...args)
  } else if (level === "error") {
    logger.error(...args)
  } else if (level === "fatal") {
    logger.fatal(...args)
  } else {
    logger.warn(...args)
  }
}
