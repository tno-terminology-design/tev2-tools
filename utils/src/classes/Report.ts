import { Logger } from "tslog"
import path = require("path")

export interface TermError extends Error {
  type?: string
  file: string
  dir: string
  line?: number
  pos?: number
}

/**
 * The Report class handles the reporting of errors and warnings.
 * It also handles the reporting of the number of files modified and terms converted.
 */
class Report {
  public onNotExist: "throw" | "warn" | "log" | "ignore" = "throw"

  public files: string[] = []
  public terms: string[] = []
  public errors: TermError[] = []

  public print(): void {
    const termErrors = this.errors.filter((err) => err.type === "TERM HELP")
    const mainErrors = this.errors.filter((err) => err.type !== "TERM HELP")

    console.log(`\x1B[0m`)
    console.log(` Resolution Report:`)
    console.log(`\t\x1b[0mFiles modified:  ${this.files.length}`)
    console.log(`\t\x1b[0mTerms converted: ${this.terms.length}`)
    console.log(`\t\x1b[0mTerm errors:     ${termErrors.length}`)
    console.log(`\t\x1b[0mMain errors:     ${mainErrors.length}`)

    if (termErrors.length > 0) {
      console.log(`\n   \x1b[1;37mTerm Errors:\x1b[0m`)

      const groupedTermErrors = new Map<string, Array<TermError>>()

      for (const err of termErrors) {
        const key = err.cause.toString()

        if (groupedTermErrors.has(key)) {
          groupedTermErrors.get(key)?.push(err)
        } else {
          groupedTermErrors.set(key, [err])
        }
      }

      // Sort the groupedTermErrors alphabetically
      const sortedEntries = Array.from(groupedTermErrors.entries()).sort((a, b) => a[0].localeCompare(b[0]))

      for (const [key, value] of sortedEntries) {
        console.log(`\x1b[1;31m${"TERM HELP"}\t\x1b[0m${key}:`)
        const filesMap = new Map<string, number[]>()

        for (const item of value) {
          const filePath = path.join(item.dir, item.file)
          if (!filesMap.has(filePath)) {
            filesMap.set(filePath, [])
          }
          filesMap.get(filePath)?.push(item.line)
        }

        for (const [file, lines] of filesMap) {
          const lineNumbers = lines.join(":")
          console.log(`   \x1b[1;37m${file}:${lineNumbers}\x1b[0m`)
        }
      }
    }

    if (mainErrors.length > 0) {
      console.log(`\n   \x1b[1;37mMain Errors:\x1b[0m`)
      const messageSet = new Set<string>()
      for (const err of mainErrors) {
        if (!messageSet.has(err.message)) {
          const { file, line, message, type } = err
          const locator = line > -1 ? `${file}:${line}` : file

          console.log(`\x1b[1;31m${type}\t\x1b[1;37m${locator}\t\t\x1b[0m${message}`)
          messageSet.add(message)
        }
      }
    }
  }

  public onNotExistError(error: Error) {
    switch (this.onNotExist) {
      case "throw":
        // an error is thrown (an exception is raised), and processing will stop
        log.error(`E006 ${error.message}, halting execution as requested by the 'onNotExist' throw option`)
        process.exit(1)
        break
      case "warn":
        // a message is displayed (and logged) and processing continues
        log.warn(error.message)
        break
      case "log":
        // a message is written to a log(file) and processing continues
        log.info(error.message)
        break
      case "ignore":
        // processing continues as if nothing happened
        break
    }
  }

  public setOnNotExist(onNotExist: string | undefined): void {
    if (!onNotExist) {
      return
    }
    const normalizedValue = onNotExist.toLowerCase() as "throw" | "warn" | "log" | "ignore"

    if (["throw", "warn", "log", "ignore"].includes(normalizedValue)) {
      this.onNotExist = normalizedValue
    } else {
      throw new Error(`Invalid value '${onNotExist}' for 'onNotExist' option.`, {
        cause: `Valid values are: 'throw', 'warn', 'log', 'ignore'`
      })
    }
  }
}

export const report = new Report()
export const log = new Logger({
  prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t"
})
