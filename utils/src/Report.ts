import { Logger } from "tslog"

interface Output<T> {
  items: T[]
}

type termError = Error & { type: string; file: string; line: number }

/**
 * The Report class handles the reporting of errors and warnings.
 * It also handles the reporting of the number of files modified and terms converted.
 */
class Report {
  public onNotExist: "throw" | "warn" | "log" | "ignore" = "throw"

  termErrors: Output<{ file: string; line: number; message: string }> = {
    items: []
  }

  converted: Output<{ content: string }> = {
    items: []
  }

  files: Output<{ content: string }> = {
    items: []
  }

  errors = new Set()

  public termHelp(file: string, line: number, message: string): void {
    this.termErrors.items.push({ file, line, message })
  }

  public mrgHelp(file: string, line: number, err: Error): void {
    const error = err as termError
    error.file = file
    error.line = line
    error.type = "MRG HELP"
    this.errors.add(this.formatMessage(error))
  }

  public termConverted(term: string): void {
    this.converted.items.push({ content: term })
  }

  public fileWritten(file: string): void {
    this.files.items.push({ content: file })
  }

  public print(): void {
    console.log("\x1b[1;37m")
    console.log(" Resolution Report:")
    console.log("\t\x1b[0mNumber of files modified: " + this.files.items.length)
    console.log("\t\x1b[0mNumber of terms converted: " + this.converted.items.length)

    if (this.termErrors.items.length > 0) {
      console.log("   \x1b[1;37mTerm Errors:\x1b[0m")

      let uniqueTermHelpMessages = new Map<string, Array<{ file: string; line: number }>>()

      for (const item of this.termErrors.items) {
        const key = item.message

        if (uniqueTermHelpMessages.has(key)) {
          uniqueTermHelpMessages.get(key)?.push(item)
        } else {
          uniqueTermHelpMessages.set(key, [item])
        }
      }

      // Sort the uniqueTermHelpMessages alphabetically
      const sortedEntries = Array.from(uniqueTermHelpMessages.entries())
      sortedEntries.sort((a, b) => a[0].localeCompare(b[0]))
      uniqueTermHelpMessages = new Map(sortedEntries)

      for (const [key, value] of uniqueTermHelpMessages) {
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

    if (this.errors.size > 0) {
      console.log("\n   \x1b[1;37mMain Errors:\x1b[0m")

      for (const err of this.errors) {
        console.log(err)
      }
    }
  }

  private formatMessage(error: termError): string {
    const { file, line, message, type } = error
    const locator = line > -1 ? `${file}:${line}` : file

    return `\x1b[1;31m${type}\t\x1b[1;37m${locator}\t\t\x1b[0m${message}`
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
