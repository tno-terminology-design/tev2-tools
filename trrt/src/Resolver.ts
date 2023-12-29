import { report, log, writeFile } from "@tno-terminology-design/utils"
import { glob } from "glob"
import { getMRGinstance, getMRGenty, type MRG } from "@tno-terminology-design/utils"
import { type Interpreter, type Term } from "./Interpreter.js"
import { type Converter } from "./Converter.js"
import { type SAF } from "@tno-terminology-design/utils"

import matter from "gray-matter"
import fs = require("fs")
import path = require("path")

type GrayMatterFile = matter.GrayMatterFile<string> & {
  path: string
  lastIndex: number
  converted: Map<string, number>
}

/**
 * The Resolver class handles the resolution of term references in files.
 * This resolution happens according to a string that is supplied in `globPattern`.
 * A file is resolved by calling the `resolve` method with the corresponding file path.
 * If the resolution was successful, the resolved file is written to the output path.
 * The `force` parameter is used to overwrite existing files.
 * The `outputPath` parameter is used to specify the output path.
 * The `globPattern` parameter is be used to specify the glob pattern.
 */
export class Resolver {
  private readonly outputPath: string
  private readonly globPattern: string
  private readonly force: boolean
  interpreter: Interpreter
  converter: Converter
  saf: SAF

  public constructor({
    outputPath,
    globPattern,
    force,
    interpreter,
    converter,
    saf
  }: {
    outputPath: string
    globPattern: string
    force: boolean
    interpreter: Interpreter
    converter: Converter
    saf: SAF
  }) {
    this.outputPath = outputPath
    this.globPattern = globPattern
    this.force = force
    this.interpreter = interpreter
    this.converter = converter
    this.saf = saf
  }

  /**
   * Iterates over the matches found by the interpreter in `file` and attempts to convert using the converter.
   * @param file The file object of the file being processed.
   * @returns A Promise that resolves to the processed data string or undefined in case of no matches.
   */
  private async matchIterator(file: GrayMatterFile): Promise<string | undefined> {
    // Get the matches of the regex in the file.orig string
    const matches: RegExpMatchArray[] = Array.from(file.orig.toString().matchAll(this.interpreter.regex))
    if (file.matter != null) {
      // If the file has frontmatter, get the matches of the regex in the frontmatter string
      // remove count of frontmatter matches from the front of the matches array
      const frontmatter: RegExpMatchArray[] = Array.from(file.matter.matchAll(this.interpreter.regex))
      matches.splice(0, frontmatter.length)
    }

    file.lastIndex = 0

    // Iterate over each match found in the file.orig string
    for (const match of matches) {
      // Interpret the match using the interpreter
      const term: Term = this.interpreter.interpret(match, this.saf)

      let mrg: MRG | undefined
      const mrgfile = term.vsntag != null ? `mrg.${term.scopetag}.${term.vsntag}.yaml` : `mrg.${term.scopetag}.yaml`
      try {
        // Get the MRG instance based on the term
        mrg = getMRGinstance(this.saf.scope.localscopedir, this.saf.scope.glossarydir, mrgfile)
      } catch (err) {
        report.mrgHelp(mrgfile, -1, err as Error)
      }

      if (mrg !== undefined && mrg.entries.length > 0) {
        this.replacementHandler(match, term, mrg, file)
      } else {
        const message = `Term ref '${match[0]}', could not be converted due to an MRG error`
        report.termHelp(file.path, file.orig.toString().substring(0, match.index).split("\n").length, message)
      }
    }
    if (file.converted.size > 0) {
      return file.orig.toString()
    } else {
      return undefined
    }
  }

  /**
   * Replaces the matched term with the generated replacement in the data string.
   * @param match - The match of the term reference.
   * @param term - The interpreted term.
   * @param mrg - The MRG instance.
   * @param file - The file object of the file being processed.
   * @returns The file object.
   */
  replacementHandler(match: RegExpMatchArray, term: Term, mrg: MRG, file: GrayMatterFile): GrayMatterFile {
    const termRefAlt = `${term.type || "default"}:${term.id}@${term.scopetag}:${term.vsntag || "default"}`

    if (!term.vsntag) {
      term.vsntag = mrg.terminology.vsntag
    }
    if (!term.type) {
      term.type = this.saf.scope.defaulttype
    }

    let termRef = `${term.type}:${term.id}@${term.scopetag}:${term.vsntag}`
    if (termRefAlt !== termRef) {
      termRef = `${termRefAlt}' > '${termRef}`
    }

    try {
      const entry = getMRGenty(mrg.entries, mrg.filename, term.id, term.type)
      const replacement = this.converter.convert(entry, term, mrg.terminology)

      // Only execute the replacement steps if the 'replacement' string is not empty
      if (replacement.length > 0 && match.index != null) {
        const startIndex = match.index + file.lastIndex
        const matchLength = match[0].length
        const textBeforeMatch = file.orig.toString().substring(0, startIndex)
        const textAfterMatch = file.orig.toString().substring(startIndex + matchLength)

        // Replace the matched term with the generated replacement in the data string
        file.orig = `${textBeforeMatch}${replacement}${textAfterMatch}`

        // Update the lastIndex to account for the length difference between the match and replacement
        file.lastIndex += replacement.length - matchLength

        // Log the converted term
        report.termConverted(entry!.term)
        file.converted.set(entry!.termid, (file.converted.get(entry!.termid) || 0) + 1)
      }
    } catch (err) {
      const message = `Term ref '${match[0]}' > '${termRef}', ${err}`
      const line = file.orig.toString().substring(0, match.index).split("\n").length
      report.termHelp(file.path, line, message)
    }

    return file
  }

  /**
   * Calles matchIterator() on files based on `this.globPattern`.
   * @returns A Promise that resolves to true if the resolution was successful.
   */
  public async resolve(): Promise<boolean> {
    // Log information about the interpreter, converter and the files being read
    log.info(`Reading files using pattern string '${this.globPattern}'`)
    log.info(`Using ${this.interpreter.type} interpreter: '${this.interpreter.regex}'`)
    log.info(`Using ${this.converter.type} template: '${this.converter.template.replace(/\n/g, "\\n")}'`)

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
        writeFile(
          path.join(this.outputPath, path.dirname(filePath), path.basename(filePath)),
          convertedData,
          this.force
        )
        changes = true
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
