import { log, writeFile, regularize } from "@tno-terminology-design/utils";
import { SAF, MRG } from "@tno-terminology-design/utils";
import { glob } from "glob";
import { TuCBuilder } from "./TuC.js";

import path = require("path");
import yaml = require("js-yaml");
import fs = require("fs");

const LOG_LEVELS: { [key in 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE']: number } = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
};

// Set the current log level (Change this for diagnostic purposes)
let currentLogLevel = LOG_LEVELS.INFO;

// Central logging function
function logMessage(level: number, message: string) {
  if (level <= currentLogLevel) {
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key as keyof typeof LOG_LEVELS] === level);
    console.log(`${new Date().toISOString()} - ${levelName} - ${message}`);
  }
}

/**
 * The Generator class generates the MRG files for the local scope.
 * The `initialize` method is called to start the generation process.
 * The `vsntag` parameter is used to specify the vsntag.
 * The `saf` parameter is used to specify the SAF.
 */
export class Generator {
  public vsntag: string;
  saf: SAF.Type;

  public constructor({ vsntag, saf }: { vsntag: string; saf: SAF.Type }) {
    this.vsntag = vsntag;
    this.saf = saf;
  }
  public initialize(): void {
    logMessage(LOG_LEVELS.INFO, "Initializing generator...");

    if (this.vsntag) {
        const vsn = this.saf.versions?.find((vsn) => vsn.vsntag === this.vsntag);
        if (vsn) {
            logMessage(LOG_LEVELS.INFO, `Processing version '${vsn.vsntag}'...`);
            const builder = new TuCBuilder({ vsn: vsn, saf: this.saf });
            this.generate(builder);
            logMessage(LOG_LEVELS.INFO, `Generated MRG for version '${vsn.vsntag}'`);
        } else {
            // similar handling for altvsntags...
        }
    } else {
        logMessage(LOG_LEVELS.INFO, "No vsntag specified, processing all versions...");
        this.saf.versions?.forEach((vsn) => {
            logMessage(LOG_LEVELS.INFO, `Processing version '${vsn.vsntag}'...`);
            const builder = new TuCBuilder({ vsn: vsn, saf: this.saf });
            this.generate(builder);
            logMessage(LOG_LEVELS.INFO, `Generated MRG for version '${vsn.vsntag}'`);
        });
    }

    // Handle synonymOf entries
    logMessage(LOG_LEVELS.INFO, "Starting synonymOf processing for all TuC instances...");
    for (const instance of TuCBuilder.instances) {
        logMessage(LOG_LEVELS.DEBUG, `Processing TuC instance with version '${instance.tuc.terminology.vsntag}'...`);
        this.handleSynonymOf(instance);
    }
  }

  /**
   * The `handleSynonymOf` method handles the synonymOf entries in the TuC.
   */
  private handleSynonymOf(instance: TuCBuilder): void {
    logMessage(LOG_LEVELS.INFO, `Handling synonyms for TuC with version '${instance.tuc.terminology.vsntag}'...`);
    let synonymCount = 0;

    for (let i = 0; i < instance.tuc.entries.length; i++) {
        let entry = instance.tuc.entries[i];

        if (entry.synonymOf) {
            synonymCount++;
            logMessage(LOG_LEVELS.DEBUG, `Found synonymOf field '${entry.synonymOf}' in entry '${entry.termid}'`);
            // existing processing logic...
        }
    }

    logMessage(LOG_LEVELS.INFO, `Processed ${synonymCount} synonyms for TuC with version '${instance.tuc.terminology.vsntag}'.`);
    for (let i = 0; i < instance.tuc.entries.length; i++) {
      let entry = instance.tuc.entries[i];

      if (entry.synonymOf) {
        const properties = entry.synonymOf.match(
          /(?:(?:(?<type>[a-z0-9_-]*):)?)(?:(?<term>[^@\n:#)]+))(?:(?:(?<identifier>@)(?:(?<scopetag>[a-z0-9_-]+)?))?(?::(?<vsntag>.+))?)/
        );

        if (properties?.groups) {
          Object.keys(properties.groups).forEach((key) => {
            properties.groups[key] = regularize(properties.groups[key]);
          });

          let match: MRG.Entry | undefined;
          try {
            if (!properties.groups.identifier) {
              match = MRG.getEntry(
                instance.tuc.entries,
                instance.tuc.filename,
                properties.groups.term ?? regularize(entry.synonymOf),
                properties.groups.type,
                this.saf.scope.defaulttype
              );
            } else {
              const mrgfile = `mrg.${properties.groups.scopetag ?? this.saf.scope.scopetag}.${properties.groups.vsntag ? properties.groups.vsntag + "." : ""}yaml`;
              const mrg = MRG.getInstance(this.saf.scope.localscopedir, this.saf.scope.glossarydir, mrgfile);
              match = MRG.getEntry(
                mrg.entries,
                mrg.filename,
                properties.groups.term ?? regularize(entry.synonymOf),
                properties.groups.type,
                this.saf.scope.defaulttype
              );
            }
          } catch (err) {
            logMessage(LOG_LEVELS.WARN, `Error retrieving entry for synonymOf field '${entry.synonymOf}' in entry '${entry.termid}': ${err}`);
            continue;
          }

          if (match) {
            ["scopetag", "vsntag", "locator", "navurl", "headingids"].forEach((key) => {
              delete entry[key];
            });

            instance.tuc.entries[i] = { ...match, ...entry };
          } else {
            logMessage(LOG_LEVELS.WARN, `No match found for entry with synonymOf: ${entry}`);
          }
        }
      }
    }

    try {
      this.generate(instance);
    } catch (err) {
      logMessage(LOG_LEVELS.ERROR, `Error during generation: ${err}`);
    }
  }

  /**
   * The `generate` method generates the MRG files for the specified TuCBuilder.
   */
  public generate(build: TuCBuilder): void {
    logMessage(LOG_LEVELS.DEBUG, `Entering generate for version '${build.tuc.terminology.vsntag}'...`);

    const output = yaml.dump(build.output(), { forceQuotes: true, quotingType: '"', noRefs: true });
    const glossarydir = path.join(this.saf.scope.localscopedir, this.saf.scope.glossarydir);

    const termids: { [termid: string]: [MRG.Entry] } = {};

    build.tuc.entries?.forEach((entry) => {
      const formPhrases = new Set<string>([entry.termid, ...(entry.formPhrases || [])]);
      formPhrases.forEach((formphrase) => {
        const termid = `${entry.termType}:${formphrase}`;
        if (termids[termid]) {
          termids[termid].push(entry);
        } else {
          termids[termid] = [entry];
        }
      });
    });

    const duplicates = Object.entries(termids).filter(([, entries]) => entries.length > 1);
    if (duplicates.length > 0) {
      const locators = duplicates.map(([termid, entries]) => {
        return `\n\t'\x1b[1;37m${termid}\x1b[0m': (${entries.map((entry) => `${entry.locator}@${entry.scopetag}`).join(", ")})`;
      }).join(", ");
      logMessage(LOG_LEVELS.DEBUG, `Duplicate termids found: ${locators}`);
    }

    const mrgFile = `mrg.${build.tuc.terminology.scopetag}.${build.tuc.terminology.vsntag}.yaml`;
    writeFile(path.join(glossarydir, mrgFile), output, true);

    if (build.tuc.terminology.altvsntags || this.saf.scope.defaultvsn === build.tuc.terminology.vsntag) {
      logMessage(LOG_LEVELS.INFO, `Creating duplicates...`);
    }

    if (this.saf.scope.defaultvsn === build.tuc.terminology.vsntag || build.tuc.terminology.altvsntags?.includes(this.saf.scope.defaultvsn)) {
      const defaultmrgURL = path.join(glossarydir, `mrg.${build.tuc.terminology.scopetag}.yaml`);
      writeFile(defaultmrgURL, output, true);
      logMessage(LOG_LEVELS.TRACE, `Created default duplicate '${path.basename(defaultmrgURL)}'`);
    }

    if (typeof build.tuc.terminology.altvsntags === "string") {
      build.tuc.terminology.altvsntags = [build.tuc.terminology.altvsntags];
    }
    build.tuc.terminology.altvsntags?.forEach((altvsntag) => {
      const altmrgURL = path.join(glossarydir, `mrg.${build.tuc.terminology.scopetag}.${altvsntag}.yaml`);
      writeFile(altmrgURL, output, true);
      logMessage(LOG_LEVELS.TRACE, `Created altvsn duplicate '${path.basename(altmrgURL)}'`);
    });

    logMessage(LOG_LEVELS.DEBUG, `Exiting generate for version '${build.tuc.terminology.vsntag}'...`);
  }

  public async prune(): Promise<void> {
    logMessage(LOG_LEVELS.INFO, "Pruning MRGs of the local scope that are not in the SAF...");

    const glossaryfiles = path.join(this.saf.scope.localscopedir, this.saf.scope.glossarydir, `mrg.${this.saf.scope.scopetag}*.yaml`);
    const mrgfiles = await glob(glossaryfiles);

    for (const mrgfile of mrgfiles) {
      const basename = path.basename(mrgfile);
      const vsntag = basename.match(/mrg.[a-z0-9_-]+(?:.([a-z0-9_-]+))?.yaml/)?.[1];
      if (vsntag != null && !this.saf.versions?.find((vsn) => vsn.vsntag === vsntag || vsn.altvsntags?.includes(vsntag))) {
        logMessage(LOG_LEVELS.TRACE, `Deleting '${basename}'...`);
        fs.unlink(mrgfile, (err) => {
          if (err) {
            logMessage(LOG_LEVELS.ERROR, `Failed to delete '${basename}': ${err}`);
            throw new Error(`Failed to delete '${basename}': ${err}`);
          }
        });
      }
    }
  }
}
