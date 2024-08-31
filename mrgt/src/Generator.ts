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

// Toggle for synonym logging (set to true to enable logging)
const LOG_SYNONYM_EXCERPTS = true; // Change this to turn logging on/off

// Function to truncate a string to a specific length
function truncate(str: string, length: number = 32): string {
  return str.length > length ? str.substring(0, length) + "..." : str;
}

// Function to log excerpts of synonym entries in a formatted table
function logSynonymExcerpt(entry: MRG.Entry, match: MRG.Entry | null, modified: MRG.Entry | null) {
  if (!LOG_SYNONYM_EXCERPTS) return;

  const fields = ["id", "term", "termType", "glossaryTerm", "glossaryText", "synonymOf", "alias"];
  const truncateLength = 32;

  // Create excerpts with truncated fields
  const excerptEntry = Object.fromEntries(fields.map(field => [field, truncate(String(entry[field] || ""), truncateLength)]));
  const excerptMatch = match ? Object.fromEntries(fields.map(field => [field, truncate(String(match[field] || ""), truncateLength)])) : {};
  const excerptModified = modified ? Object.fromEntries(fields.map(field => [field, truncate(String(modified[field] || ""), truncateLength)])) : {};

  // Determine the maximum width for each column
  const maxFieldWidth = Math.max(...fields.map(field => field.length));
  const maxEntryWidth = Math.max(...fields.map(field => excerptEntry[field].length)) + 2; // Padding with spaces
  const maxMatchWidth = match ? Math.max(...fields.map(field => excerptMatch[field]?.length || 0)) + 2 : 10; // Empty columns if no match
  const maxModifiedWidth = modified ? Math.max(...fields.map(field => excerptModified[field]?.length || 0)) + 2 : 15; // Empty columns if no modified entry

  // Decide the appropriate label for the third column based on the context
  const modifiedLabel = match ? "Modified Entry" : "Modified Match";

  // Function to format a table row
  function formatRow(field: string, entryValue: string, matchValue: string = '', modifiedValue: string = ''): string {
    return `  ${field.padEnd(maxFieldWidth)} | ${entryValue.padEnd(maxEntryWidth)} | ${matchValue.padEnd(maxMatchWidth)} | ${modifiedValue.padEnd(maxModifiedWidth)}`;
  }

  // Log the table header using the same logging function
  logMessage(
    LOG_LEVELS.INFO,
    formatRow('Field', 'Entry', 'Match', modifiedLabel)
  );

  // Log separator line
  logMessage(LOG_LEVELS.INFO, '-'.repeat(2 + maxFieldWidth + maxEntryWidth + maxMatchWidth + maxModifiedWidth + 9));

  // Log each row for the fields
  fields.forEach(field => {
    logMessage(LOG_LEVELS.INFO, formatRow(field, excerptEntry[field], excerptMatch[field] || '', excerptModified[field] || ''));
  });

  // Add a blank line after the table
  logMessage(LOG_LEVELS.INFO, '');
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
    let successCount = 0;
    let failureCount = 0;
    const processedSynonyms: { entry: MRG.Entry; match: MRG.Entry; modified: MRG.Entry }[] = []; // Store processed synonyms for final log

    for (let i = 0; i < instance.tuc.entries.length; i++) {
      let entry = instance.tuc.entries[i];

      if (entry.synonymOf) {
        synonymCount++;

        // Add an empty line for readability in the log
        logMessage(LOG_LEVELS.INFO, '');
        logMessage(LOG_LEVELS.INFO, '#'.repeat(40));
        logMessage(LOG_LEVELS.INFO, '');

        logMessage(LOG_LEVELS.DEBUG, `Processing entry with synonymOf field: ${entry.termid}`);
        this.logEntry(entry);  // Log the entry with the synonymOf field

        // Extract properties from synonymOf field
        const properties = entry.synonymOf.match(
          /(?:(?:(?<type>[a-z0-9_-]*):)?)(?:(?<term>[^@\n:#)]+))(?:(?:(?<identifier>@)(?:(?<scopetag>[a-z0-9_-]+)?))?(?::(?<vsntag>.+))?)/
        );

        if (properties?.groups) {
          Object.keys(properties.groups).forEach((key) => {
            properties.groups[key] = regularize(properties.groups[key]);
          });

          // Log the named capturing groups after regularization
          logMessage(LOG_LEVELS.INFO, `Named capturing groups after regularization: ${JSON.stringify(properties.groups)}`);

          // Determine the entries list: either from the current TuC or an MRG file
          let entriesList: MRG.Entry[] = [];
          let sourceDescription = "TuC";  // Default to TuC
          if (!properties.groups.identifier) {
            // Search within the current TuC entries
            entriesList = instance.tuc.entries;
          } else {
            // Search within another MRG file
            const mrgfile = `mrg.${properties.groups.scopetag ?? this.saf.scope.scopetag}.${properties.groups.vsntag ? properties.groups.vsntag + "." : ""}yaml`;
            const mrg = MRG.getInstance(this.saf.scope.localscopedir, this.saf.scope.glossarydir, mrgfile);
            sourceDescription = `MRG file '${mrgfile}'`;  // Update source description
            entriesList = mrg.entries;
          }

          logMessage(LOG_LEVELS.INFO, `The synonym search is conducted in: ${sourceDescription}`);

          // First-Level Search: Using NCG `term` and `type` (allow `type` to be undefined if not provided)
          let firstLevelMatches: MRG.Entry[] = [];
          try {
            logMessage(LOG_LEVELS.INFO, `Calling getEntry with term: '${properties.groups.term}', type: '${properties.groups.type}', from: '${sourceDescription}'`);
            firstLevelMatches.push(MRG.getEntry(
              entriesList,
              sourceDescription,
              properties.groups.term ?? regularize(entry.synonymOf),
              properties.groups.type // Allow `type` to be undefined if not defined
            ));
            logMessage(LOG_LEVELS.INFO, `getEntry returned ${firstLevelMatches.length} match(es).`);
            this.logFirstThreeEntries(firstLevelMatches);  // Log the matched entry

            // If a single match is found, process it
            this.processSynonymMatch(entry, firstLevelMatches[0], instance, processedSynonyms);
            successCount++;
            continue;

          } catch (err) {
            if (err.message.includes("Multiple")) {
              // If multiple matches, log the error but continue to the second-level search
              logMessage(LOG_LEVELS.WARN, `Multiple entries found: ${err.message}. Proceeding to second-level search.`);
              firstLevelMatches = entriesList.filter(e => e.formPhrases.includes(properties.groups.term));
            } else {
              // If not multiple matches but a "not found" error, log and continue to the second level search
              logMessage(LOG_LEVELS.WARN, `First-level search failed: ${err.message}. Proceeding to second-level search.`);
            }
          }

          // Second-Level Search: Using `termType` of `syn-entry` or `defaulttype`
          try {
            const typeForSecondSearch = entry.termType ? entry.termType : this.saf.scope.defaulttype;

            // Check if we have a valid type for filtering
            if (!typeForSecondSearch) {
              logMessage(LOG_LEVELS.WARN, `Both 'termType' for entry '${entry.termid}' and 'defaulttype' are undefined. Cannot filter matches accurately.`);
              logSynonymExcerpt(entry, null, null); // Log the table with empty Match and Modified columns
              failureCount++;
              continue;
            }

            // Narrow down entriesList to the first-level matches for the second-level search
            logMessage(LOG_LEVELS.INFO, `Number of entries for second-level search: ${firstLevelMatches.length}`);
            this.logFirstThreeEntries(firstLevelMatches); // Log the first three entries in a table format

            // Perform second-level search
            logMessage(LOG_LEVELS.INFO, `Calling getEntry with term: '${properties.groups.term}', type: '${typeForSecondSearch}', from: '${sourceDescription}'`);
            let match = MRG.getEntry(
              firstLevelMatches,  // Use first-level matches as entries list
              sourceDescription,
              properties.groups.term ?? regularize(entry.synonymOf),
              typeForSecondSearch // Use `termType` of `syn-entry` or `defaulttype`
            );
            logMessage(LOG_LEVELS.INFO, `getEntry returned ${match ? 1 : 0} match(es).`);
            this.logFirstThreeEntries([match]);  // Log the matched entry

            // If a single match is found, process it
            this.processSynonymMatch(entry, match, instance, processedSynonyms);
            successCount++;

          } catch (err) {
            logMessage(LOG_LEVELS.WARN, `Second-level search failed: ${err.message}.`);
            failureCount++;
            logSynonymExcerpt(entry, null, null); // Log the table with empty Match and Modified columns
          }
        }
      }
    }

    logMessage(LOG_LEVELS.INFO, `Processed ${synonymCount} synonyms for TuC with version '${instance.tuc.terminology.vsntag}'.`);
    logMessage(LOG_LEVELS.INFO, `Successful: ${successCount}, Failed: ${failureCount}`); // Log summary

    try {
      this.generate(instance);
    } catch (err) {
      logMessage(LOG_LEVELS.ERROR, `Error during generation: ${err}`);
    }
  }

  private logFirstThreeEntries(entriesList: MRG.Entry[]): void {
    const fields = ["id", "term", "termType", "glossaryTerm", "glossaryText", "synonymOf", "alias"];
    const truncateLength = 32;

    // Prepare table headers
    logMessage(LOG_LEVELS.INFO, `  Field        | First entry                      | Second entry                     | Third entry`);
    logMessage(LOG_LEVELS.INFO, `-----------------------------------------------------------------------------------------------------`);

    // Log each row for the fields
    fields.forEach(field => {
      const firstEntryValue = entriesList[0] ? truncate(String(entriesList[0][field] || ""), truncateLength) : '';
      const secondEntryValue = entriesList[1] ? truncate(String(entriesList[1][field] || ""), truncateLength) : '';
      const thirdEntryValue = entriesList[2] ? truncate(String(entriesList[2][field] || ""), truncateLength) : '';
      logMessage(LOG_LEVELS.INFO, `  ${field.padEnd(12)} | ${firstEntryValue.padEnd(30)} | ${secondEntryValue.padEnd(30)} | ${thirdEntryValue.padEnd(30)}`);
    });

    // Add a blank line after the table
    logMessage(LOG_LEVELS.INFO, '');
  }

  private logEntry(entry: MRG.Entry): void {
    const fields = ["id", "term", "termType", "glossaryTerm", "glossaryText", "synonymOf", "alias"];
    const truncateLength = 32;

    // Log each field with its value
    logMessage(LOG_LEVELS.INFO, `Entry Details:`);
    fields.forEach(field => {
      const value = truncate(String(entry[field] || ""), truncateLength);
      logMessage(LOG_LEVELS.INFO, `  ${field}: ${value}`);
    });

    // Add a blank line after the entry details
    logMessage(LOG_LEVELS.INFO, '');
  }

  /**
   * Process the successful synonym match and update the entry.
   */
  private processSynonymMatch(entry: MRG.Entry, match: MRG.Entry, instance: TuCBuilder, processedSynonyms: { entry: MRG.Entry; match: MRG.Entry; modified: MRG.Entry }[]): void {
    const originalEntry = { ...entry }; // Preserve original entry for logging

    // Replace certain fields in entry with those from match
    ["scopetag", "vsntag", "locator", "navurl", "headingids"].forEach((key) => {
      delete entry[key];
    });

    // Update the entry with the matched entry's fields
    instance.tuc.entries[instance.tuc.entries.indexOf(entry)] = { ...match, ...entry };

    // Log the detected synonym with the modified entry
    logSynonymExcerpt(originalEntry, match, instance.tuc.entries[instance.tuc.entries.indexOf(entry)]);

    // Store the processed synonym pair for final log after treatment
    processedSynonyms.push({ entry: originalEntry, match, modified: instance.tuc.entries[instance.tuc.entries.indexOf(entry)] });
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
