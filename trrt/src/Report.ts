import { Logger } from "tslog"

interface Output<T> {
  items: T[]
}

/**
 * The Report class handles the reporting of errors and warnings.
 * It also handles the reporting of the number of files modified and terms converted.
 */
class Report {
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

  public mrgHelp(file: string, line: number, message: string): void {
    this.errors.add(this.formatMessage("MRG HELP", file, line, message))
  }

  public termConverted(term: any): void {
    this.converted.items.push({ content: term })
  }

  public fileWritten(file: string): void {
    this.files.items.push({ content: file })
  }

  public print(): void {
    console.log("\x1b[1;37m")
    console.log(" Resolution Report:")
    console.log("       \x1b[0mNumber of files modified: " + this.files.items.length)
    console.log("       \x1b[0mNumber of terms converted: " + this.converted.items.length)

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
        console.log(`\x1b[1;31m${"TERM HELP".padEnd(12)} \x1b[0m${key}:`)
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

  private formatMessage(type: string, file: string, line: number, message: string): string {
    let locator = `${file}`
    if (line > -1) {
      locator += `:${line}`
    }

    if (locator.length > 50) {
      locator = `...${locator.slice(-(50 - 5))}`
    }
    locator = locator.padEnd(50)

    const formattedMessage = `\x1b[1;31m${type.padEnd(12)} \x1b[1;37m${locator} \x1b[0m${message}`
    return formattedMessage
  }
}

export const report = new Report()
export const log = new Logger()
