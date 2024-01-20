import { Logger } from "tslog"

export interface TermError extends Error {
  type?: string
  file: string
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
    console.log("\x1b[1;37m")
    console.log(" Resolution Report:")
    console.log("\t\x1b[0mNumber of files modified: " + this.files.length)
    console.log("\t\x1b[0mNumber of terms converted: " + this.terms.length)

    const termErrors = this.errors.filter((err) => err.type === "TERM HELP")

    if (termErrors.length > 0) {
      console.log("   \x1b[1;37mTerm Errors:\x1b[0m")

      const groupedTermErrors = new Map<string, Array<TermError>>()

      for (const error of termErrors) {
        const key = error.message

        if (groupedTermErrors.has(key)) {
          groupedTermErrors.get(key)?.push(error)
        } else {
          groupedTermErrors.set(key, [error])
        }
      }

      // Sort the groupedTermErrors alphabetically
      const sortedEntries = Array.from(groupedTermErrors.entries()).sort((a, b) => a[0].localeCompare(b[0]))

      for (const [key, value] of sortedEntries) {
        console.log(`\x1b[1;31m${"TERM HELP"}\t\x1b[0m${key}:`)
        const filesMap = new Map<string, number[]>()

        for (const item of value) {
          if (!filesMap.has(item.file)) {
            filesMap.set(item.file, [])
          }
          filesMap.get(item.file)?.push(item.line)
        }

        for (const [file, lines] of filesMap) {
          const lineNumbers = lines.join(":")
          console.log(`   \x1b[1;37m${file}:${lineNumbers}`)
        }
      }
    }

    const mainErrors = this.errors.filter((err) => err.type !== "term")
    if (mainErrors.length > 0) {
      console.log("\n   \x1b[1;37mMain Errors:\x1b[0m")

      for (const err of mainErrors) {
        const { file, line, message, type } = err
        const locator = line > -1 ? `${file}:${line}` : file
        console.log(`\x1b[1;31m${type}\t\x1b[1;37m${locator}\t\t\x1b[0m${message}`)
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
