import { log, writeFile, regularize } from "@tno-terminology-design/utils"
import { SAF, MRG } from "@tno-terminology-design/utils"
import { glob } from "glob"
import { TuCBuilder } from "./TuC.js"

import path = require("path")
import yaml = require("js-yaml")
import fs = require("fs")

/**
 * The Generator class generates the MRG files for the local scope.
 * The `initialize` method is called to start the generation process.
 * The `vsntag` parameter is used to specify the vsntag.
 * The `saf` parameter is used to specify the SAF.
 */
export class Generator {
  public vsntag: string
  saf: SAF.Type

  public constructor({ vsntag, saf }: { vsntag: string; saf: SAF.Type }) {
    this.vsntag = vsntag
    this.saf = saf
  }

  public initialize(): void {
    log.info("Initializing generator...")

    // Check if the vsntag exists in the SAF
    if (this.vsntag) {
      const vsn = this.saf.versions?.find((vsn) => vsn.vsntag === this.vsntag)
      if (vsn) {
        log.info(
          `\x1b[1;37mProcessing version '${vsn.vsntag}' (mrg.${this.saf.scope.scopetag}.${vsn.vsntag}.yaml)...\x1b[0m`
        )
        this.generate(new TuCBuilder({ vsn: vsn, saf: this.saf }))
      } else {
        // check altvsntags
        const vsn = this.saf.versions?.find((vsn) => vsn.altvsntags.includes(this.vsntag))

        if (vsn) {
          log.info(
            `\x1b[1;37mProcessing version '${vsn.vsntag}' (altvsn '${this.vsntag}') (mrg.${this.saf.scope.scopetag}.${vsn.vsntag}.yaml)...\x1b[0m`
          )
          this.generate(new TuCBuilder({ vsn: vsn, saf: this.saf }))
        } else {
          throw new Error(`The specified vsntag '${this.vsntag}' was not found in the SAF`)
        }
      }
    } else {
      // If no vsntag was specified, process all versions
      log.info(`No vsntag was specified. Processing all versions...`)
      if (this.saf.versions?.length === 0) {
        throw new Error(`No versions were found in the SAF`)
      }
      this.saf.versions?.forEach((vsn) => {
        log.info(
          `\x1b[1;37mProcessing version '${vsn.vsntag}' (mrg.${this.saf.scope.scopetag}.${vsn.vsntag}.yaml)...\x1b[0m`
        )
        this.generate(new TuCBuilder({ vsn: vsn, saf: this.saf }))
      })
    }

    // Handle synonymOf entries if they exist in curated text
    if (TuCBuilder.synonymOf.length > 0) {
      for (const instance of TuCBuilder.instances) {
        if (instance.tuc.cText) {
          log.info(`\x1b[1;37mProcessing synonymOf entries...\x1b[0m`)
          // temporarily set the log level to 4 to suppress the output of the MRG files
          log.settings.minLevel = 4
          this.handleSynonymOf(instance)
        }
      }
      log.settings.minLevel = 1
    }
  }

  /**
   * The `synonymOf` method handles the synonymOf entries in the TuC.
   * It attempts to find the corresponding entry in the MRG and merges the synonymOf entry with the MRG entry.
   * If no corresponding entry is found, the synonymOf entry is removed.
   */
  private handleSynonymOf(instance: TuCBuilder): void {
    for (let entry of TuCBuilder.synonymOf!) {
      entry = instance.tuc.entries.find((e) => e.termid === entry.termid)!
      if (!entry) {
        continue
      }
      const index = instance.tuc.entries.indexOf(entry)
      // wrangle the synonymOf field using a regex
      const properties = entry.synonymOf!.match(
        /(?:(?:(?<type>[a-z0-9_-]*):)?)(?:(?<term>[^@\n:#)]+))(?:(?:(?<identifier>@)(?:(?<scopetag>[a-z0-9_-]+)?))?(?::(?<vsntag>.+))?)/
      )
      if (properties?.groups) {
        Object.keys(properties.groups).forEach((key) => {
          properties.groups[key] = regularize(properties.groups[key])
        })
        let match: MRG.Entry
        try {
          // if no identifier (@) is specified, refer to the entries in the TuC
          if (!properties.groups.identifier) {
            match = MRG.getEntry(
              instance.tuc.entries,
              instance.tuc.filename,
              properties.groups.term,
              properties.groups.type,
              this.saf.scope.defaulttype
            )
            // if the identifier is @, refer to the MRG
          } else {
            const mrgfile = `mrg.${properties.groups.scopetag ?? this.saf.scope.scopetag}.${
              properties.groups.vsntag ? properties.groups.vsntag + "." : ""
            }yaml`
            const mrg = MRG.getInstance(this.saf.scope.localscopedir, this.saf.scope.glossarydir, mrgfile)
            match = MRG.getEntry(
              mrg.entries,
              mrg.filename,
              properties.groups.term,
              properties.groups.type,
              this.saf.scope.defaulttype
            )
          }
        } catch (err) {
          // log a warning and remove the synonymOf entry
          delete instance.tuc.entries[index]
          log.warn(`\tEntry '${entry.termid}' with SynonymOf field (${entry.synonymOf}) was removed:`, err)
        }
        // if a match was found, merge the synonymOf entry with the matched MRG entry
        if (match) {
          Object.keys(entry).forEach((key) => {
            if (["scopetag", "vsntag", "locator", "navurl", "headingids"].includes(key.toLowerCase())) {
              delete entry[key]
            }
          })
          instance.tuc.entries[index] = { ...match, ...entry }
        }
      }
    }

    // regenerate the MRG files
    try {
      this.generate(instance)
    } catch (err) {
      log.error(err)
    }
  }

  /**
   * The `generate` method generates the MRG files for the specified TuCBuilder.
   * @param build - The TuCBuilder to generate the MRG files for.
   */
  public generate(build: TuCBuilder): void {
    const output = yaml.dump(build.output(), { forceQuotes: true, quotingType: '"', noRefs: true })
    const glossarydir = path.join(this.saf.scope.localscopedir, this.saf.scope.glossarydir)

    // Check for duplicate termids in the MRG
    const termids: { [termid: string]: [MRG.Entry] } = {} // Map of termids to their corresponding entries
    // add termids constructed from termtype and all form phrases
    build.tuc.entries?.forEach((entry) => {
      const formPhrases = new Set<string>([entry.termid, ...(entry.formPhrases || [])])
      formPhrases.forEach((formphrase) => {
        const termid = `${entry.termType}:${formphrase}`
        if (termids[termid]) {
          termids[termid].push(entry)
        } else {
          termids[termid] = [entry]
        }
      })
    })
    const duplicates = Object.entries(termids).filter(([, entries]) => entries.length > 1)
    if (duplicates.length > 0) {
      // create a string of the locators for each duplicate
      const locators = duplicates
        .map(([termid, entries]) => {
          return `\n\t'\x1b[1;37m${termid}\x1b[0m': (${entries
            .map((entry) => `${entry.locator}@${entry.scopetag}`)
            .join(", ")})`
        })
        .join(", ")
      throw new Error(
        `Duplicate termids, or combination of termType and formPhrase, found in provisional MRG of version '${build.tuc.terminology.vsntag}': ${locators}`
      )
    }

    // Output the MRG to a file
    const mrgFile = `mrg.${build.tuc.terminology.scopetag}.${build.tuc.terminology.vsntag}.yaml`
    writeFile(path.join(glossarydir, mrgFile), output, true)

    if (build.tuc.terminology.altvsntags || this.saf.scope.defaultvsn === build.tuc.terminology.vsntag) {
      log.info(`\tCreating duplicates...`)
    }

    // if the version is the default version, create a duplicate {mrg.{import-scopetag}.yaml}
    if (
      this.saf.scope.defaultvsn === build.tuc.terminology.vsntag ||
      build.tuc.terminology.altvsntags?.includes(this.saf.scope.defaultvsn)
    ) {
      const defaultmrgURL = path.join(glossarydir, `mrg.${build.tuc.terminology.scopetag}.yaml`)
      writeFile(defaultmrgURL, output, true)
      log.trace(`\t\t'${path.basename(defaultmrgURL)}' (default)`)
    }

    // Create a duplicate for every altvsntag
    if (typeof build.tuc.terminology.altvsntags === "string") {
      build.tuc.terminology.altvsntags = [build.tuc.terminology.altvsntags]
    }
    build.tuc.terminology.altvsntags?.forEach((altvsntag) => {
      const altmrgURL = path.join(glossarydir, `mrg.${build.tuc.terminology.scopetag}.${altvsntag}.yaml`)
      writeFile(altmrgURL, output, true)
      log.trace(`\t\t'${path.basename(altmrgURL)}' (altvsn)`)
    })
  }

  public async prune(): Promise<void> {
    log.info(`\x1b[1;37mPruning MRGs of the local scope that are not in the SAF...\x1b[0m`)
    const glossaryfiles = path.join(
      this.saf.scope.localscopedir,
      this.saf.scope.glossarydir,
      `mrg.${this.saf.scope.scopetag}*.yaml`
    )
    // get all mrg files that match the glossaryfiles pattern
    const mrgfiles = await glob(glossaryfiles)

    for (const mrgfile of mrgfiles) {
      const basename = path.basename(mrgfile)
      // get the vsntag from the basename
      const vsntag = basename.match(/mrg.[a-z0-9_-]+(?:.([a-z0-9_-]+))?.yaml/)?.[1]
      // if the vsntag (or altvsntag) is not in the SAF, delete the mrgfile
      if (
        vsntag != null &&
        !this.saf.versions?.find((vsn) => vsn.vsntag === vsntag || vsn.altvsntags?.includes(vsntag))
      ) {
        log.trace(`\tDeleting '${basename}'...`)
        fs.unlink(mrgfile, (err) => {
          if (err) {
            throw new Error(`Failed to delete '${basename}': ${err}`)
          }
        })
      }
    }
  }
}
