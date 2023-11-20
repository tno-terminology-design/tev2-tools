import { report, log } from "@tno-terminology-design/utils"
import { glob } from "glob"
import { MrgBuilder, type MRG, type Entry } from "@tno-terminology-design/utils"
import { type Interpreter, type Term } from "./Interpreter.js"
import { type Converter } from "./Converter.js"
import { type SAF } from "@tno-terminology-design/utils"

import matter from "gray-matter"
import fs = require("fs")
import path = require("path")

type GrayMatterFile = matter.GrayMatterFile<string> & { path: string; lastIndex: number; converted: number }

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
   * Creates directory tree and writes data to a file.
   * @param fullPath - The full file path.
   * @param data - The data to write.
   * @param force - Whether to overwrite existing files.
   */
  private writeFile(fullPath: string, data: string, force: boolean = false): void {
    const dirPath = path.dirname(fullPath)
    const file = path.basename(fullPath)
    // Check if the directory path doesn't exist
    if (!fs.existsSync(dirPath)) {
      // Create the directory and any necessary parent directories recursively
      try {
        fs.mkdirSync(dirPath, { recursive: true })
      } catch (err) {
        log.error(`E007 Error creating directory '${dirPath}':`, err)
        return // Stop further execution if directory creation failed
      }
    } else if (!force && fs.existsSync(path.join(dirPath, file))) {
      // If the file already exists and force is not enabled, don't overwrite
      log.error(`E013 File '${path.join(dirPath, file)}' already exists. Use --force to overwrite`)
      return // Stop further execution if force is not enabled and file exists
    }

    const filepath = path.join(dirPath, file)
    try {
      fs.writeFileSync(filepath, data)
      report.fileWritten(filepath)
    } catch (err) {
      log.error(`E008 Error writing file '${filepath}':`, err)
    }
  }

  /**
   * Iterates over the matches found by the interpreter in `file` and attempts to convert using the converter.
   * @param file The file object of the file being processed.
   * @returns A Promise that resolves to the processed data string or undefined in case of no matches.
   */
  private async matchIterator(file: GrayMatterFile): Promise<string | undefined> {
    // Get the matches of the regex in the file.orig string
    const matches: RegExpMatchArray[] = Array.from(file.orig.toString().matchAll(this.interpreter.getRegex()))
    if (file.matter != null) {
      // If the file has frontmatter, get the matches of the regex in the frontmatter string
      // remove count of frontmatter matches from the front of the matches array
      const frontmatter: RegExpMatchArray[] = Array.from(file.matter.matchAll(this.interpreter.getRegex()))
      matches.splice(0, frontmatter.length)
    }

    file.lastIndex = 0
    file.converted = 0

    // Iterate over each match found in the file.orig string
    for (const match of matches) {
      // Interpret the match using the interpreter
      const term: Term = this.interpreter.interpret(match, this.saf)

      // Get the MRG instance based on the term
      const mrg = this.getMRGInstance(term)

      if (mrg !== undefined && mrg.entries.length > 0) {
        this.replacementHandler(match, term, mrg, file)
      } else {
        continue
      }
    }
    if (file.converted > 0) {
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
    const termRefAlt = `${term.type || "default"}:${term.id}@${term.scopetag || "default"}:${term.vsntag || "default"}`

    if (!term.vsntag) {
      term.vsntag = mrg.terminology.vsntag
    }
    if (!term.type) {
      term.type = this.saf.scope.defaulttype
    }
    if (!term.scopetag) {
      term.scopetag = this.saf.scope.scopetag
    }

    let termRef = `${term.type}:${term.id}@${term.scopetag}:${term.vsntag}`
    if (termRefAlt !== termRef) {
      termRef = `${termRefAlt}' > '${termRefAlt}`
    }

    // Find the matching entry in mrg.entries based on the term
    let matchingEntries = mrg.entries.filter((entry) => entry.term === term.id || entry.altterms?.includes(term.id))

    let replacement = ""
    let entry: Entry | undefined
    if (matchingEntries.length > 1) {
      if (this.saf.scope.defaulttype) {
        matchingEntries = mrg.entries.filter((entry) => entry.type === term.type)
      } else {
        // Multiple matches found, display a warning
        const message = `Term ref '${match[0]}' > '${termRef}', has multiple matching MRG entries in '${mrg.filename}'`
        report.termHelp(file.path, file.orig.toString().substring(0, match.index).split("\n").length, message)
      }
    }
    if (matchingEntries.length === 1) {
      entry = matchingEntries[0]
      term.id = entry.term
      // Convert the term using the configured converter
      replacement = this.converter.convert(entry, term)
      if (replacement === "") {
        const message = `Term ref '${match[0]}' > '${termRef}', resulted in an empty string, check the converter`
        report.termHelp(file.path, file.orig.toString().substring(0, match.index).split("\n").length, message)
      }
    } else {
      const message = `Term ref '${match[0]}' > '${termRef}', could not be matched with an MRG entry`
      report.termHelp(file.path, file.orig.toString().substring(0, match.index).split("\n").length, message)
    }

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
      file.converted++
    }

    return file
  }

  /**
   * Returns an MRG class instance based on the term's properties.
   * @param term - The interpreted term.
   * @returns The MRG class instance.
   */
  getMRGInstance(term: Term): MRG | undefined {
    const mrgFile = term.vsntag != null ? `mrg.${term.scopetag}.${term.vsntag}.yaml` : `mrg.${term.scopetag}.yaml`

    try {
      let mrg: MRG | undefined

      // Check if an MRG class instance with the `filename` property of `mrgFile` has already been loaded
      for (const instance of MrgBuilder.instances) {
        if (instance.filename === mrgFile) {
          mrg = instance
          break
        }
      }
      // If no existing MRG class instance was found, build the MRG according to the `mrgFile`
      if (mrg == null) {
        mrg = new MrgBuilder({ filename: mrgFile, saf: this.saf, populate: false }).mrg
      }

      return mrg
    } catch (err) {
      report.mrgHelp(mrgFile, -1, (err as Error).message)
    }
  }

  /**
   * Calles matchIterator() on files based on `this.globPattern`.
   * @returns A Promise that resolves to true if the resolution was successful.
   */
  public async resolve(): Promise<boolean> {
    // Log information about the interpreter, converter and the files being read
    log.info(`Reading files using pattern string '${this.globPattern}'`)

    // Get the list of files based on the glob pattern
    const files = await glob(this.globPattern)

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
        this.writeFile(
          path.join(this.outputPath, path.dirname(filePath), path.basename(filePath)),
          convertedData,
          this.force
        )
      }
    }

    return true
  }
}
