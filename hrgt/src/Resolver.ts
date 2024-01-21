import { glob } from "glob"
import { Interpreter, type MRGRef } from "./Interpreter.js"
import { Converter, Profile } from "./Converter.js"
import { SAF, MRG } from "@tno-terminology-design/utils"
import { report, log, writeFile } from "@tno-terminology-design/utils"

import matter from "gray-matter"
import fs = require("fs")
import path = require("path")

type GrayMatterFile = matter.GrayMatterFile<string> & {
  path: string
  lastIndex: number
  output: string
  converted: number
}

/**
 * The Resolver class handles the resolution of references in files.
 * This resolution happens to files specified by the `globPattern`.
 * The `resolve` method is called to start the resolution process.
 * If the resolution was successful, a resolved file is written to `outputPath`.
 * The `force` parameter is used to overwrite existing files.
 * The `sorter` parameter is used to specify the sorter.
 * The `interpreter` parameter is used to specify the interpreter.
 * The `converter` parameter is used to specify the converter.
 * The `saf` parameter is used to specify the SAF.
 */
export class Resolver {
  private readonly outputPath: string
  private readonly globPattern: string
  private readonly force: boolean
  sorter: Converter
  interpreter: Interpreter
  converter: Converter
  saf: SAF.Type

  public constructor({
    outputPath,
    globPattern,
    force,
    sorter,
    interpreter,
    converter,
    saf
  }: {
    outputPath: string
    globPattern: string
    force: boolean
    sorter: string
    interpreter: string
    converter: string
    saf: string
  }) {
    this.outputPath = outputPath
    this.globPattern = globPattern
    this.force = force
    this.sorter = new Converter({ template: sorter })
    this.interpreter = new Interpreter({ regex: interpreter })
    this.converter = new Converter({ template: converter })
    this.saf = new SAF.Builder({ scopedir: saf }).saf

    Converter.saf = this.saf
  }

  /**
   * Iterates over the matches found by the interpreter in `file` and attempts to convert using the converter.
   * @param file The file object of the file being processed.
   * @returns A Promise that resolves to the processed data string or undefined in case of no matches.
   */
  private async matchIterator(file: GrayMatterFile): Promise<string | undefined> {
    // Find all the matches according to the interpreter regex
    const matches: RegExpMatchArray[] = Array.from(file.orig.toString().matchAll(this.interpreter.regex))
    if (file.matter != null) {
      // Remove matches that are part of the frontmatter
      const frontmatter: RegExpMatchArray[] = Array.from(file.matter.matchAll(this.interpreter.regex))
      matches.splice(0, frontmatter.length)
    }

    file.lastIndex = 0 // lastIndex is used to account for the length difference between the matches and replacements
    file.converted = 0 // converted is used to count the number of terms that were converted
    file.output = file.orig.toString()

    // Iterate over each match found in the file.orig string
    for (const match of matches) {
      log.info(`\x1b[1;37mFound MRG Reference '${match[0]}' in file '${file.path}'`)

      // Interpret the match using the interpreter
      const mrgref: MRGRef = this.interpreter.interpret(match)

      const mrgfile = `mrg.${mrgref.scopetag || this.saf.scope.scopetag}${
        mrgref.vsntag ? "." + mrgref.vsntag : ""
      }.yaml`
      try {
        // Get the MRG instance based on `mrgfile`
        const mrg = MRG.getInstance(this.saf.scope.localscopedir, this.saf.scope.glossarydir, mrgfile)
        log.info(`\tFound ${mrg.entries.length} entr${mrg.entries.length === 1 ? "y" : "ies"} in '${mrg.filename}'`)

        if (mrg.entries.length > 0) {
          // Start the replacement process
          this.replacementHandler(match, mrgref, mrg, file)
        } else {
          continue
        }
      } catch (err) {
        report.onNotExistError(err)
      }
    }
    if (file.converted > 0) {
      return file.output
    } else {
      return undefined
    }
  }

  /**
   * Replaces the matched MRG reference in the file with the generated replacement.
   * @param match - The match of the MRG reference.
   * @param termref - The interpreted MRG reference.
   * @param mrg - The MRG instance.
   * @param file - The file object of the file being processed.
   * @returns The processed file object.
   */
  replacementHandler(match: RegExpMatchArray, mrgref: MRGRef, mrg: MRG.Type, file: GrayMatterFile): GrayMatterFile {
    let converter = this.converter
    let sorter = this.sorter
    const entries = [...mrg.entries]

    // Sort entries according to the sort parameter in the MRGRef or the default
    if (mrgref.sorter != null) {
      sorter = new Converter({ template: mrgref.sorter })
      log.info(`\tUsing ${sorter.type} sorter: '${sorter.template.replace(/\n/g, "\\n")}'`)
    } else {
      log.info(`\tUsing default set sorter (${sorter.type})`)
    }
    entries.sort((a, b) =>
      sorter
        .convert({ int: this.interpreter, ref: mrgref, entry: a, mrg: mrg.terminology })
        .localeCompare(sorter.convert({ int: this.interpreter, ref: mrgref, entry: b, mrg: mrg.terminology }))
    )

    // Check if the MRGRef has a converter specified
    if (mrgref.converter != null) {
      converter = new Converter({ template: mrgref.converter })
      log.info(`\tUsing ${converter.type} converter: '${converter.template.replace(/\n/g, "\\n")}'`)
    } else {
      log.info(`\tUsing default set converter (${converter.type})`)
    }

    let replacement = ""
    file.orig = file.orig.toString()

    for (const entry of entries) {
      const line = file.orig.substring(0, match.index).split("\n").length
      const pos = file.output.split("\n")[line - 1].indexOf(match[0])

      const hrgEntry = converter.convert({
        int: this.interpreter,
        ref: mrgref,
        entry: entry,
        mrg: mrg.terminology,
        err: {
          filename: file.path,
          line,
          pos
        }
      } as Profile)
      if (hrgEntry == converter.getBlank()) {
        log.warn(
          `\t\tConversion of entry '${entry.term}${
            entry.termType ? ":" + entry.termType : ""
          }' did not fill in any expression`
        )
      }
      replacement += hrgEntry
    }

    // Only execute the replacement steps if the 'replacement' string is not empty
    if (replacement.length > 0 && match.index != null) {
      const startIndex = match.index + file.lastIndex
      const matchLength = match[0].length
      const textBeforeMatch = file.output.substring(0, startIndex)
      const textAfterMatch = file.output.substring(startIndex + matchLength)

      // Replace the reference with the generated replacement
      file.output = `${textBeforeMatch}${replacement}${textAfterMatch}`

      // Update the lastIndex to account for the length difference between the reference and replacement
      file.lastIndex += replacement.length - matchLength

      // Log the converted term
      file.converted++
    }

    return file
  }

  /**
   * Calles matchIterator() on files based on `this.globPattern`.
   */
  public async resolve(): Promise<void> {
    // Log information about the interpreter, converter and the files being read
    log.info(`Using ${this.interpreter.type} interpreter: '${this.interpreter.regex}'`)
    log.info(`Using ${this.sorter.type} sorter as default: '${this.sorter.template.replace(/\n/g, "\\n")}'`)
    log.info(`Using ${this.converter.type} converter as default: '${this.converter.template.replace(/\n/g, "\\n")}'`)
    log.info(`Reading files using pattern string '${this.globPattern}'`)

    // Get the list of files based on the glob pattern
    const files = await glob(this.globPattern)
    let changes: boolean

    if (files.length === 0) {
      throw new Error(`Check input (glob pattern)`, {
        cause: `No files found using pattern string '${this.globPattern}'`
      })
    }

    // Process each file
    for (const filePath of files) {
      // Read the file content
      let file
      try {
        file = matter(fs.readFileSync(filePath, "utf8")) as GrayMatterFile
        file.path = filePath
      } catch (err) {
        log.error(`E009 Could not read file '${filePath}':`, err)
        continue
      }

      // Interpret and convert the file data
      let convertedData
      try {
        convertedData = await this.matchIterator(file)
      } catch (err) {
        log.error(`E010 Could not interpret or convert file '${file.path}':`, err)
        continue
      }

      // Write the converted data to the output file
      if (convertedData != null) {
        try {
          const filepath = path.join(this.outputPath, path.dirname(filePath), path.basename(filePath))
          log.info(`Writing modified file to '${filepath}'`)
          writeFile(filepath, convertedData, this.force)
          report.files.push(filepath)
          changes = true
        } catch (err) {
          log.error(err)
          continue
        }
      }
    }
    if (!changes) {
      log.warn(
        `No changes were made to any files, confirm that the MRG References exist and the interpreter is correct`
      )
    }
  }
}
