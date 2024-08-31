import { log, writeFile, regularize } from "@tno-terminology-design/utils";
import { SAF, MRG } from "@tno-terminology-design/utils";
import { glob } from "glob";
import { TuCBuilder } from "./TuC.js";

import path = require("path");
import yaml = require("js-yaml");
import fs = require("fs");

// Function to truncate a string such that it shows the beginning and end parts with '...' in between
function truncate(str: string, length: number = 27): string {
  // Ensure the length is at least 7 to properly format the output as required
  if (length < 7) length = 7;

  // If the string is shorter than or equal to the specified length, return it as is
  if (str.length <= length) return str;

  // Calculate the number of characters to show from the beginning and end
  const n = Math.floor((length - 3) / 2); // Calculate n to accommodate the length including '...'
  const start = str.slice(0, n);          // First n characters
  const end = str.slice(-n);              // Last n characters

  return `${start}...${end}`; // Return the formatted string
}

// Function to log excerpts of synonym entries in a formatted table
function logSynonymExcerpt(synEntry: MRG.Entry, matchEntry: MRG.Entry | null, mergedEntry: MRG.Entry | null) {
  const fields = ["id", "term", "termType", "glossaryTerm", "glossaryText", "synonymOf", "alias", "formPhrases"];
  const truncateLength = 32;

  // Create excerpts for each entry with truncated fields
  const excerptSynEntry = Object.fromEntries(fields.map(field => [field, truncate(String(synEntry[field] || ""), truncateLength)]));
  const excerptMatchEntry = matchEntry ? Object.fromEntries(fields.map(field => [field, truncate(String(matchEntry[field] || ""), truncateLength)])) : {};
  const excerptMergedEntry = mergedEntry ? Object.fromEntries(fields.map(field => [field, truncate(String(mergedEntry[field] || ""), truncateLength)])) : {};

  // Determine the maximum width for each column
  const maxFieldWidth = Math.max(...fields.map(field => field.length));
  const maxSynEntryWidth = Math.max(...fields.map(field => excerptSynEntry[field].length)) + 2; // Padding with spaces
  const maxMatchEntryWidth = matchEntry ? Math.max(...fields.map(field => excerptMatchEntry[field]?.length || 0)) + 2 : 10; // Empty columns if no match
  const maxMergedEntryWidth = mergedEntry ? Math.max(...fields.map(field => excerptMergedEntry[field]?.length || 0)) + 2 : 15; // Empty columns if no merged entry

  // Function to format a table row
  function formatRow(field: string, synValue: string, matchValue: string = '', mergedValue: string = ''): string {
    return `  ${field.padEnd(maxFieldWidth)} | ${synValue.padEnd(maxSynEntryWidth)} | ${matchValue.padEnd(maxMatchEntryWidth)} | ${mergedValue.padEnd(maxMergedEntryWidth)}`;
  }

  // Log the table header using the same logging function
  // log.debugformatRow('Field', 'Syn Entry', 'Match Entry', 'Merged Entry'));

  // Log each row for the fields
  fields.forEach(field => {
    //   log.debugformatRow(
    //   field,
    //   excerptSynEntry[field],
    //   excerptMatchEntry[field] || '',
    //   excerptMergedEntry[field] || ''
    // ));
  });

  // Add a blank line after the table for better readability
  // log.debug'');
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
    log.info("Initializing generator...");

    if (this.vsntag) {
        const vsn = this.saf.versions?.find((vsn) => vsn.vsntag === this.vsntag);
        if (vsn) {
            log.info(`Processing version '${vsn.vsntag}'...`);
            const builder = new TuCBuilder({ vsn: vsn, saf: this.saf });
            this.generate(builder);
            log.info(`Generated MRG for version '${vsn.vsntag}'`);
        }
    } else {
        log.info("No vsntag specified, processing all versions...");
        this.saf.versions?.forEach((vsn) => {
            log.info(`Processing version '${vsn.vsntag}'...`);
            const builder = new TuCBuilder({ vsn: vsn, saf: this.saf });
            this.generate(builder);
            log.info(`Generated MRG for version '${vsn.vsntag}'`);
        });
    }

    // Handle synonymOf entries
    // log.debug"Starting synonymOf processing for all TuC instances...");
    for (const instance of TuCBuilder.instances) {
        // log.debug`Processing TuC instance with version '${instance.tuc.terminology.vsntag}'...`);
        this.handleSynonymOf(instance);
    }
  }

  /**
   * The `handleSynonymOf` method handles the synonymOf entries in the TuC.
   */
  private handleSynonymOf(instance: TuCBuilder): void {
    // log.debug`Handling synonyms for TuC with version '${instance.tuc.terminology.vsntag}'...`);
    let synonymCount = 0;
    let successCount = 0;
    let failureCount = 0;
    const processedSynonyms: { entry: MRG.Entry; match: MRG.Entry; modified: MRG.Entry }[] = []; // Store processed synonyms for final log

    for (let i = 0; i < instance.tuc.entries.length; i++) {
      let entry = instance.tuc.entries[i];

      if (entry.synonymOf) {
        synonymCount++;
        // log.debug`Processing entry with synonymOf field: ${entry.termid}`);
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
          // log.debug`Named capturing groups after regularization: ${JSON.stringify(properties.groups)}`);

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

          // log.debug`The synonym search is conducted in: ${sourceDescription}`);

          // First-Level Search: Using NCG `term` and `type` (allow `type` to be undefined if not provided)
          let firstLevelMatches: MRG.Entry[] = [];
          try {
            log.trace(`Calling getAllMatches with term: '${properties.groups.term}', type: '${properties.groups.type ?? "empty"}', from: '${sourceDescription}'`);
            
            // Use getAllMatches to find all matching entries
            firstLevelMatches = MRG.getAllMatches(
              entriesList,
              sourceDescription,
              properties.groups.term ?? regularize(entry.synonymOf),
              properties.groups.type // Allow `type` to be undefined if not defined
            );

            // log.debug`First-level search returned ${firstLevelMatches.length} match(es).`);
            this.logFirstThreeEntries(firstLevelMatches);

            if (firstLevelMatches.length === 1) {
              // If a single match is found, process it
              this.processSynonymMatch(entry, firstLevelMatches[0], instance, processedSynonyms);
              successCount++;
              continue;
            } else if (firstLevelMatches.length === 0) {
              // log.debug`No matches found in the first-level search. Skipping to next entry.`);
              failureCount++;
              continue;
            }

          } catch (err) {
            log.error(`Error during first-level search: ${err.message}.`);
            failureCount++;
            continue;
          }

          // Second-Level Search: Using `termType` of `syn-entry` or `defaulttype`
          try {
            const typeForSecondSearch = entry.termType ? entry.termType : this.saf.scope.defaulttype;

            // Check if we have a valid type for filtering
            if (!typeForSecondSearch) {
              // log.debug`Both 'termType' for entry '${entry.termid}' and 'defaulttype' are undefined. Cannot filter matches accurately.`);
              logSynonymExcerpt(entry, null, null); // Log the table with empty Match and Modified columns
              failureCount++;
              continue;
            }

            // Log entries before refining in the second-level search
            // log.debug`Number of entries for second-level search: ${firstLevelMatches.length}`);
            this.logFirstThreeEntries(firstLevelMatches); // Log the first three entries in a table format

            // Perform second-level search using type
            // log.debug`Refining matches with term: '${properties.groups.term}', type: '${typeForSecondSearch}', from: '${sourceDescription}'`);
            const secondLevelMatches = MRG.getAllMatches(
              firstLevelMatches,  // Use first-level matches as entries list
              sourceDescription,
              properties.groups.term ?? regularize(entry.synonymOf),
              typeForSecondSearch // Use `termType` of `syn-entry` or `defaulttype`
            );

            // log.debug`Second-level search returned ${secondLevelMatches.length} match(es).`);
            this.logFirstThreeEntries(secondLevelMatches);  // Log the matched entries for the second-level search

            if (secondLevelMatches.length === 1) {
              // If a single match is found, process it
              this.processSynonymMatch(entry, secondLevelMatches[0], instance, processedSynonyms);
              successCount++;
            } else if (secondLevelMatches.length === 0) {
              log.warn(`Second-level search failed: No match found for term '${properties.groups.term}' with type '${typeForSecondSearch}' in '${sourceDescription}'.`);
              failureCount++;
              logSynonymExcerpt(entry, null, null); // Log the table with empty Match and Modified columns
            } else {
              log.warn(`Multiple matches still found after second-level search for term '${properties.groups.term}' with type '${typeForSecondSearch}' in '${sourceDescription}'.`);
              failureCount++;
              logSynonymExcerpt(entry, secondLevelMatches[0], null); // Log the table with potential matches
            }
          } catch (err) {
            log.error(`Error during second-level search: ${err.message}.`);
            failureCount++;
          }
        }
      }
    }

    log.info(`Processed ${synonymCount} synonyms for TuC with version '${instance.tuc.terminology.vsntag}'.`);
    log.info(`Successful: ${successCount}, Failed: ${failureCount}`); // Log summary

    try {
      this.generate(instance);
    } catch (err) {
      log.error(`Error during generation: ${err}`);
    }
  }

  private logFirstThreeEntries(entriesList: MRG.Entry[]): void {
    const fields = ["id", "term", "termType", "glossaryTerm", "glossaryText", "synonymOf", "alias"];
    const truncateLength = 32;

    // Prepare table headers
    // log.debug`  Field        | First entry                      | Second entry                     | Third entry`);
    // log.debug`-----------------------------------------------------------------------------------------------------`);

    // Log each row for the fields
    fields.forEach(field => {
      const firstEntryValue = entriesList[0] ? truncate(String(entriesList[0][field] || ""), truncateLength) : '';
      const secondEntryValue = entriesList[1] ? truncate(String(entriesList[1][field] || ""), truncateLength) : '';
      const thirdEntryValue = entriesList[2] ? truncate(String(entriesList[2][field] || ""), truncateLength) : '';
      // log.debug`  ${field.padEnd(12)} | ${firstEntryValue.padEnd(30)} | ${secondEntryValue.padEnd(30)} | ${thirdEntryValue.padEnd(30)}`);
    });

    // Add a blank line after the table
    // log.debug'');
  }

  private logEntry(entry: MRG.Entry): void {
    const fields = ["id", "term", "termType", "glossaryTerm", "glossaryText", "synonymOf", "alias"];
    const truncateLength = 32;

    // Log each field with its value
    // log.debug`Entry Details:`);
    fields.forEach(field => {
      const value = truncate(String(entry[field] || ""), truncateLength);
      // log.debug`  ${field}: ${value}`);
    });

    // Add a blank line after the entry details
    // log.debug'');
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

    // Create the merged entry by combining fields from the syn entry and the match entry
    const mergedEntry = { ...match, ...entry };

    // Update the entry in the instance with the merged entry
    instance.tuc.entries[instance.tuc.entries.indexOf(entry)] = mergedEntry;

    // Log the detected synonym with the modified entry
    logSynonymExcerpt(originalEntry, match, mergedEntry); // Pass the merged entry for logging

    // Store the processed synonym pair for final log after treatment
    processedSynonyms.push({ entry: originalEntry, match, modified: mergedEntry });
  }

  /**
   * The `generate` method generates the MRG files for the specified TuCBuilder.
   */
  public generate(build: TuCBuilder): void {
    // log.debug`Entering generate for version '${build.tuc.terminology.vsntag}'...`);

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
      // log.debug`Duplicate termids found: ${locators}`);
    }

    const mrgFile = `mrg.${build.tuc.terminology.scopetag}.${build.tuc.terminology.vsntag}.yaml`;
    writeFile(path.join(glossarydir, mrgFile), output, true);

    if (build.tuc.terminology.altvsntags || this.saf.scope.defaultvsn === build.tuc.terminology.vsntag) {
      log.info(`Creating duplicate MRGs...`);
    }

    if (this.saf.scope.defaultvsn === build.tuc.terminology.vsntag || build.tuc.terminology.altvsntags?.includes(this.saf.scope.defaultvsn)) {
      const defaultmrgURL = path.join(glossarydir, `mrg.${build.tuc.terminology.scopetag}.yaml`);
      writeFile(defaultmrgURL, output, true);
      log.info(`Created default duplicate '${path.basename(defaultmrgURL)}'`);
    }

    if (typeof build.tuc.terminology.altvsntags === "string") {
      build.tuc.terminology.altvsntags = [build.tuc.terminology.altvsntags];
    }
    build.tuc.terminology.altvsntags?.forEach((altvsntag) => {
      const altmrgURL = path.join(glossarydir, `mrg.${build.tuc.terminology.scopetag}.${altvsntag}.yaml`);
      writeFile(altmrgURL, output, true);
      log.trace(`Created altvsn duplicate '${path.basename(altmrgURL)}'`);
    });

    // log.debug`Exiting generate for version '${build.tuc.terminology.vsntag}'...`);
  }


}
