import { glob } from "glob"
import { Interpreter, type MRGRef } from "./Interpreter.js"
import { Converter } from "./Converter.js"
import { Sorter } from "./Sorter.js"
import { SAF, MRG } from "@tno-terminology-design/utils"
import { report, log, writeFile, type TermError, type Profile } from "@tno-terminology-design/utils"

import matter from "gray-matter"
import fs = require("fs")
import path = require("path")

interface GrayMatterFile extends matter.GrayMatterFile<string> {
  path: path.ParsedPath
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
  saf: SAF.Type

  public constructor({
    outputPath,
    globPattern,
    force,
    sorter,
    interpreter,
    saf
  }: {
    outputPath: string
    globPattern: string
    force: boolean
    sorter: string
    interpreter: string
    saf: string
  }) {
    this.outputPath = outputPath
    this.globPattern = globPattern
    this.force = force
    this.sorter = new Sorter({ template: sorter })
    this.interpreter = new Interpreter({ regex: interpreter })
    this.saf = new SAF.Builder({ scopedir: saf }).saf
  }

  /**
   * Iterates over the matches found by the interpreter in `file` and attempts to convert using the converter.
   * @param file The file object of the file being processed.
   * @returns A Promise that resolves to the processed data string or undefined in case of no matches.
   */
  private async matchIterator(file: GrayMatterFile): Promise<string | undefined> {
    try {
        // Find all matches according to the interpreter regex
        const matches: RegExpMatchArray[] = Array.from(file.orig.toString().matchAll(this.interpreter.regex));
        if (file.matter != null) {
            // Remove matches that are part of the frontmatter
            const frontmatter: RegExpMatchArray[] = Array.from(file.matter.matchAll(this.interpreter.regex));
            matches.splice(0, frontmatter.length);
        }

        file.lastIndex = 0; // Reset lastIndex to account for the length difference between the matches and replacements
        file.output = file.orig.toString(); // Initialize file output

        // Iterate over each match found in the file
        for (const match of matches) {
            log.info(`\x1b[1;37mFound MRG Reference '${match[0]}' in file '${file.path.base}'\x1b[0m`);

            // Interpret the match using the interpreter
            const mrgref: MRGRef = this.interpreter.interpret(match);
            if (!mrgref) {
                log.error(`Failed to interpret MRG reference in file '${file.path.base}' at index ${match.index}`);
                continue; // Skip this match and proceed to the next
            }

            // Construct the MRG file path
            const mrgfile = `mrg.${mrgref.scopetag || this.saf.scope.scopetag}${mrgref.vsntag ? "." + mrgref.vsntag : ""}.yaml`;

            let mrg: MRG.Type | null = null;
            try {
                // Get the MRG instance based on the constructed file path
                mrg = MRG.getInstance(this.saf.scope.localscopedir, this.saf.scope.glossarydir, mrgfile);
                if (!mrg || !mrg.entries) {
                    throw new Error(`MRG file '${mrgfile}' could not be found or contains no entries.`);
                }
                log.info(`\tFound ${mrg.entries.length} entr${mrg.entries.length === 1 ? "y" : "ies"} in '${mrg.filename}'`);
            } catch (err) {
                log.error(`Error loading MRG file '${mrgfile}': ${err.message}`);
                this.replacementHandler(match, mrgref, null, file); // Attempt error handling replacement
                report.onNotExistError(err);
                continue; // Skip to the next match
            }

            // Ensure MRG entries exist before processing
            if (mrg.entries.length > 0) {
                try {
                    // Start the replacement process
                    this.replacementHandler(match, mrgref, mrg, file);
                } catch (err) {
                    log.error(`Error during replacement for MRG reference '${match[0]}' in file '${file.path.base}': ${err.message}`);
                }
            } else {
                log.warn(`MRG file '${mrg.filename}' contains no entries to process for reference '${match[0]}' in file '${file.path.base}'`);
                continue; // Skip to the next match
            }
        }

        // Return processed output if there were any conversions
        if (file.converted > 0) {
            return file.output;
        } else {
            log.info(`No conversions were made for file '${file.path.base}'.`);
            return undefined;
        }
    } catch (err) {
        log.error(`Unexpected error during match iteration: ${err.message}`);
        return undefined;
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
    file.orig = file.orig.toString()
    const line = file.orig.substring(0, match.index).split("\n").length
    const pos = file.output.split("\n")[line - 1].indexOf(match[0])

    let sorter: Converter
    let converters: Converter[]
    let replacement = ""

    const profile: Profile = {
      int: this.interpreter,
      ref: mrgref,
      mrg: mrg.terminology,
      err: {
        file: file.path.base,
        dir: file.path.dir,
        line,
        pos
      } as TermError
    }

    if (mrg != null) {
      const entries = [...mrg.entries]

      // Sort entries according to the sort parameter in the MRGRef or the default
      if (mrgref.sorter != null) {
        sorter = new Sorter({ template: mrgref.sorter })
        log.info(`\tUsing ${sorter.type} sorter: '${sorter.template.replace(/\n/g, "\\n")}'`)
      } else {
        sorter = this.sorter
        log.info(`\tUsing default set sorter (${sorter.type})`)
      }
      entries.sort((a, b) =>
        sorter
          .convert({ int: this.interpreter, ref: mrgref, entry: a, mrg: mrg.terminology })
          .localeCompare(sorter.convert({ int: this.interpreter, ref: mrgref, entry: b, mrg: mrg.terminology }))
      )

      // Check if the MRGRef has a converter specified
      if (mrgref.converter != null) {
        // Converter specified inline in MRGRef
        converters = [new Converter({ template: mrgref.converter })]
        log.info(`\tUsing inline MRGRef converter: '${converters[0].template.replace(/\n/g, "\\n")}'`)
      } else if (Converter.instances.filter((i) => i.n > 0).length > 0) {
          // Converters specified via command line or configuration file
          converters = Converter.instances.filter((i) => i.n > 0)
          log.info(`\tUsing converters specified in configuration or command line`)
      } else {
          // Fallback to a default converter if no other is specified
          converters = [new Converter({ template: 'markdown-table-row' })] // Example default
          log.info(`\tNo converter is specified - using default converter: 'markdown-table-row'`)
      }

      for (const entry of entries) {
        profile.entry = entry
        for (const converter of converters) {
          try {
            const hrgEntry = converter.convert(profile)
            replacement += hrgEntry
          } catch (err) {
            log.warn(`\t\t${err.message}`)
            log.settings.minLevel = undefined // reset the log level set by {{log level="silent"}}
            try {
              const error = Converter.instances.find((i) => i.n === -1)
              profile.err.message = err.message
              if (error) {
                replacement = error.convert(profile)
              }
            } catch (err) {
              log.warn(`\t\t${err.message}`)
            }
          }
          log.settings.minLevel = undefined // reset the log level set by {{log level="silent"}}
        }
      }
    } else {
      report.onNotExistError(new Error(`Something went wrong while retrieving the MRG file '${mrgref.hrg}'`))
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

      // Update the number of converted references
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
    for (const i of Converter.instances.filter((i) => i.n > 0)) {
      log.info(`Using '${i.type}' template as ${i.name}: '${i.template.replace(/\n/g, "\\n")}'`)
    }
    Converter.instances.reverse() // reverse the order of the converters to correctly handle converter[n] options
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
        file.path = path.parse(filePath)
        file.converted = 0
      } catch (err) {
        log.error(`E009 Could not read file '${filePath}':`, err)
        continue
      }

      // Interpret and convert the file data
      let convertedData
      try {
        convertedData = await this.matchIterator(file)
      } catch (err) {
        log.error(`E010 Could not interpret or convert file '${path.join(file.path.dir, file.path.base)}':`, err)
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
