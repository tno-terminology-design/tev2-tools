import { report, log } from "@tno-terminology-design/utils"
import { glob } from "glob"
import { MrgBuilder, type MRG } from "@tno-terminology-design/utils"
import { Interpreter, type MRGRef } from "./Interpreter.js"
import { Converter } from "./Converter.js"
import { type SAF, SafBuilder } from "@tno-terminology-design/utils"

import matter from "gray-matter"
import fs = require("fs")
import path = require("path")

type GrayMatterFile = matter.GrayMatterFile<string> & { path: string; lastIndex: number; converted: number }

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
    interpreter: string
    converter: string
    saf: string
  }) {
    this.outputPath = outputPath
    this.globPattern = globPattern
    this.force = force
    this.interpreter = new Interpreter({ regex: interpreter })
    this.converter = new Converter({ template: converter })
    this.saf = new SafBuilder({ scopedir: saf }).saf

    Converter.saf = this.saf
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
      log.info(`\x1b[1;37mFound MRG reference '${match[0]}' in file '${file.path}'`)

      // Interpret the match using the interpreter
      const mrgref: MRGRef = this.interpreter.interpret(match, this.saf)

      // Get the MRG instance based on the MRGRef
      const mrgFile = `mrg.${mrgref.hrg.replace(":", ".")}.yaml`
      const mrg = this.getMRGInstance(mrgFile)

      if (mrg !== undefined && mrg.entries.length > 0) {
        this.replacementHandler(match, mrgref, mrg, file)
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

  replacementHandler(match: RegExpMatchArray, mrgref: MRGRef, mrg: MRG, file: GrayMatterFile): GrayMatterFile {
    let converter: Converter
    // TODO: sort MRG entries according to the glossaryTerm?

    // Check if the MRGRef has a converter specified
    if (mrgref.converter === "" || mrgref.converter == null) {
      converter = this.converter
      log.info(`\tUsing default set converter '${converter.type}'`)
    } else {
      converter = new Converter({ template: mrgref.converter })
    }

    let replacement = ""
    log.info(`\tFound ${mrg.entries.length} entr${mrg.entries.length === 1 ? "y" : "ies"} in '${mrg.filename}'`)
    for (const entry of mrg.entries) {
      const hrgEntry = converter.convert(entry, mrgref)
      if (hrgEntry == converter.getBlank()) {
        log.warn(`Conversion of entry '${entry.term}' from '${mrg.filename}' did not fill in any expression`)
      }
      replacement += hrgEntry
    }

    // Only execute the replacement steps if the 'replacement' string is not empty
    if (replacement.length > 0 && match.index != null) {
      const startIndex = match.index + file.lastIndex
      const matchLength = match[0].length
      const textBeforeMatch = file.orig.toString().substring(0, startIndex)
      const textAfterMatch = file.orig.toString().substring(startIndex + matchLength)

      // Replace the reference with the generated replacement
      file.orig = `${textBeforeMatch}${replacement}${textAfterMatch}`

      // Update the lastIndex to account for the length difference between the reference and replacement
      file.lastIndex += replacement.length - matchLength

      // // Log the converted term
      file.converted++
    }

    return file
  }

  /**
   * Returns an MRG class instance based on the mrg filename.
   * @param term - The interpreted term.
   * @returns The MRG class instance.
   */
  getMRGInstance(mrgFile: string): MRG | undefined {
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
        const filepath = path.join(this.outputPath, path.dirname(filePath), path.basename(filePath))
        log.info(`\tWriting generated HRG to '${filepath}'`)
        this.writeFile(filepath, convertedData, this.force)
      }
    }

    return true
  }
}
