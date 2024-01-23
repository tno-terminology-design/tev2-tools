import { report, log, writeFile, regularize, type TermError } from "@tno-terminology-design/utils"
import { glob } from "glob"
import { MRG, SAF } from "@tno-terminology-design/utils"
import { Interpreter, type TermRef } from "./Interpreter.js"
import { Converter, type Profile } from "./Converter.js"

import matter from "gray-matter"
import fs = require("fs")
import path = require("path")

interface GrayMatterFile extends matter.GrayMatterFile<string> {
  path: string
  lastIndex: number
  output: string
  converted: Map<string, number>
}

/**
 * The Resolver class handles the resolution of references in files.
 * This resolution happens to files specified by the `globPattern`.
 * The `resolve` method is called to start the resolution process.
 * If the resolution was successful, a resolved file is written to `outputPath`.
 * The `force` parameter is used to overwrite existing files.
 * The `interpreter` parameter is used to specify the interpreter.
 * The `saf` parameter is used to specify the SAF.
 */
export class Resolver {
  private readonly outputPath: string
  private readonly globPattern: string
  private readonly force: boolean
  interpreter: Interpreter
  saf: SAF.Type

  public constructor({
    outputPath,
    globPattern,
    force,
    interpreter,
    saf
  }: {
    outputPath: string
    globPattern: string
    force: boolean
    interpreter: Interpreter
    saf: SAF.Type
  }) {
    this.outputPath = outputPath
    this.globPattern = globPattern
    this.force = force
    this.interpreter = interpreter
    this.saf = saf
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
    file.output = file.orig.toString()

    // Iterate over each match found in the file.orig string
    for (const match of matches) {
      let mrg: MRG.Type | undefined

      // Interpret the match using the interpreter
      const termref: TermRef = this.interpreter.interpret(match)
      const scopetag = termref.scopetag ?? this.saf.scope.scopetag
      const vsntag = termref.vsntag ? `.${termref.vsntag}` : ""

      const mrgfile = `mrg.${scopetag}${vsntag}.yaml`

      try {
        // Get the MRG instance based on `mrgfile`
        mrg = MRG.getInstance(this.saf.scope.localscopedir, this.saf.scope.glossarydir, mrgfile)
      } catch (err) {
        report.errors.push({ type: "MRG HELP", file: file.path, cause: err } as TermError)
      }

      // Start the replacement process
      this.replacementHandler(match, termref, mrg, file)
    }
    if (file.converted.size > 0) {
      return file.output
    } else {
      return undefined
    }
  }

  /**
   * Replaces the matched term in the file with the generated replacement.
   * @param match - The match of the term reference.
   * @param termref - The interpreted term referebce.
   * @param mrg - The MRG instance.
   * @param file - The file object of the file being processed.
   * @returns The processed file object.
   */
  replacementHandler(match: RegExpMatchArray, termref: TermRef, mrg: MRG.Type, file: GrayMatterFile): GrayMatterFile {
    file.orig = file.orig.toString()
    const line = file.orig.substring(0, match.index).split("\n").length
    const pos = file.output.split("\n")[line - 1].indexOf(match[0])

    let error: Error | undefined
    let replacement = ""

    try {
      const profile: Profile = {
        int: this.interpreter,
        ref: termref,
        err: {
          file: file.path,
          line,
          pos
        } as TermError
      }

      try {
        if (mrg == undefined || mrg.entries.length === 0) {
          throw new Error(`could not be converted due to an MRG error`)
        }
        profile.mrg = mrg.terminology

        profile.entry = MRG.getEntry(
          mrg.entries,
          mrg.filename,
          termref.term ?? regularize(termref.showtext),
          termref.type,
          this.saf.scope.defaulttype
        )

        // get the Converter instance where n is higher than or the same as the number of times the term has been converted
        const count = file.converted.get(`${profile.entry.termid}`) ?? 0
        const converter = Converter.instances.find((i) => i.n <= count)
        if (converter) {
          replacement = converter.convert(profile)
        }
      } catch (err) {
        error = err // store the error so it can be thrown after the replacement steps with converter[error]
        profile.err.cause = err.message
        const converter = Converter.instances.find((i) => i.n === -1) // get the Converter instance where n = -1 (converter[error] option)
        if (converter) {
          replacement = converter.convert(profile)
        }
      }

      // Only execute the replacement steps if the 'replacement' string is not empty
      if (replacement.length > 0 && match.index != null) {
        const startIndex = match.index + file.lastIndex
        const matchLength = match[0].length
        const textBeforeMatch = file.output.substring(0, startIndex)
        const textAfterMatch = file.output.substring(startIndex + matchLength)

        // Replace the matched term with the generated replacement in the data string
        file.output = `${textBeforeMatch}${replacement}${textAfterMatch}`

        // Update the lastIndex to account for the length difference between the match and replacement
        file.lastIndex += replacement.length - matchLength
      }

      if (error) {
        // Also log if a reference was converted with converter[error]
        file.converted.set(undefined, (file.converted.get(undefined) || 0) + 1)
        throw error
      } else {
        // Log the converted term
        report.terms.push(profile.entry!.term)
        file.converted.set(profile.entry!.termid, (file.converted.get(profile.entry!.termid) || 0) + 1)
      }
    } catch (err) {
      // Log `TERM HELP` message with useful information about the term reference interpretation
      const display = { ...termref }

      display.type = display.type ? display.type + ":" : ""
      display.term = display.term ?? "\x1b[3m<showtext>\x1b[0m"
      display.scopetag = display.scopetag ?? "\x1b[3m<default>\x1b[0m"
      display.vsntag = display.vsntag ? ":" + display.vsntag : ""

      let reference = `${display.type}${display.term}@${display.scopetag}${display.vsntag}`

      const interpretation = `${display.type}${termref.term ?? regularize(termref.showtext)}@${
        mrg.terminology.scopetag
      }${display.vsntag}`
      if (interpretation !== reference) {
        reference = `${reference}' > '${interpretation}`
      }
      const message = `Term ref '${match[0]}' > '${reference}', ${err}`
      report.errors.push({ type: "TERM HELP", line, file: file.path, cause: message } as TermError)
    }

    return file
  }

  /**
   * Calles matchIterator() on files based on `this.globPattern`.
   * @returns A Promise that resolves to true if the resolution was successful.
   */
  public async resolve(): Promise<boolean> {
    // Log information about the interpreter, converter and the files being read
    log.info(`Using ${this.interpreter.type} interpreter: '${this.interpreter.regex}'`)
    for (const i of Converter.instances) {
      const n = i.n === -1 ? "[error]" : i.n > 0 ? `[${i.n}]` : ""
      log.info(`Using '${i.type}' template as converter${n}: '${i.template.replace(/\n/g, "\\n")}'`)
    }
    Converter.instances.reverse() // reverse the order of the converters to correctly handle converter[n] options
    log.info(`Reading files using pattern string '${this.globPattern}'`)

    // Get the list of files based on the glob pattern
    const files = await glob(this.globPattern)
    let changes: boolean

    log.info(`Found ${files.length} files`)

    // Process each file
    for (const filePath of files) {
      // Read the file content
      let file
      try {
        file = matter(fs.readFileSync(filePath, "utf8")) as GrayMatterFile
        file.path = filePath
        file.converted = new Map()
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
          writeFile(
            path.join(this.outputPath, path.dirname(filePath), path.basename(filePath)),
            convertedData,
            this.force
          )
          report.files.push(filePath)
          changes = true
        } catch (err) {
          log.error(err)
          continue
        }
      }
    }
    if (!changes) {
      log.warn(
        `No changes were made to any files, confirm that the Term References exist and the interpreter is correct`
      )
    }

    return true
  }
}
