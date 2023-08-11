import { log, report } from './Report.js';
import { glob } from 'glob';

import fs = require("fs");
import path = require('path');
import yaml = require('js-yaml');

interface SAF {
      scope: Scope;
      scopes: Scopes[];
      versions: Version[];
}

interface Scope {
      website: string;
      scopetag: string;
      scopedir: string;
      curatedir: string;
      glossarydir: string;
      defaultvsn: string;
      mrgfile: string;
}

interface Scopes {
      scopetags: string[];
      scopedir: string;
}

interface Version {
      vsntag: string;
      mrgfile: string;
      altvsntags: string[];
}

interface MRG {
      terminology: Terminology;
      scopes: Scopes[];
      entries: Entry[];
}

interface Terminology {
      scopetag: string;
      scopedir: string;
      curatedir: string;
      vsntag: string;
      altvsntags: string[];
}

export interface Entry {
      term: string;
      vsntag: string;
      scopetag: string;
      locator: string;
      formPhrases?: string;
      glossaryText: string;
      navurl?: string;
      headingids?: string[];
      altvsntags?: string[];
      [key: string]: any;
}

export interface Output {
      entries: Entry[];
}

export class Glossary {
      public scopedir: string;
      public saf!: SAF;
      public runtime: Output = {
            entries: []
      };

      public constructor({ scopedir}: { scopedir: string}) {
            this.scopedir = scopedir;

            this.saf = this.getSafMap(path.join(this.scopedir, 'saf.yaml'));
      }

      /**
       * Initializes the glossary by populating the runtime glossary.
       * @returns A promise that resolves to the populated runtime glossary.
       */
      public async initialize() {
            // Find all mrgfiles in the glossarydir
            let glossarydir = path.join(this.scopedir, this.saf.scope.glossarydir);
            let mrgfiles = await glob(path.join(glossarydir, 'mrg.*.*.yaml'));

            if (mrgfiles.length < 1) {
                  log.error(`E001 No MRG files found in the glossary directory '${glossarydir}'`);
                  process.exit(1);
            }

            // Get the MRG map of each MRG file
            for (const mrgfile of mrgfiles) {
                  const mrg = await this.getMrgMap(mrgfile);
                  // Populate the runtime glossary with the MRG entries
                  await this.populateRuntime(mrg, mrgfile);
            }
            
            return this.runtime;
      }

      /**
       * Retrieves the SAF (Scope Administration File) map.
       * @returns A promise that resolves to the SAF map.
       */
      private getSafMap(safURL: string): SAF {
            let saf = {} as SAF;

            try {
                  // Try to load the SAF map from the scopedir
                  saf = yaml.load(fs.readFileSync(safURL, 'utf8')) as SAF;

                  // Check for missing required properties in SAF
                  type ScopeProperty = keyof Scope;
                  const requiredProperties: ScopeProperty[] = ['scopetag', 'scopedir', 'curatedir', 'defaultvsn'];
                  const missingProperties = requiredProperties.filter(prop => !saf.scope[prop]);

                  if (missingProperties.length > 0) {
                        log.error(`E002 Missing required property in SAF at '${safURL}': '${missingProperties.join("', '")}'`);
                        process.exit(1);
                  }
            } catch (err) {
                  log.error(`E004 An error occurred while attempting to load the SAF at '${safURL}':`, err);
                  process.exit(1);
            }

            return saf;
      }

      /**
       * Retrieves the MRG (Machine Readable Glossary) map.
       * @returns A promise that resolves to the MRG map.
       */
      public async getMrgMap(mrgURL: string): Promise<MRG> {
            let mrg = {} as Promise<MRG>;
      
            try {
                  // Try to load the MRG map from the `mrgURL`
                  const mrgfile = fs.readFileSync(mrgURL, 'utf8');
                  mrg = yaml.load(mrgfile) as Promise<MRG>;

                  // Check for missing required properties in MRG terminology
                  type TerminologyProperty = keyof Terminology;
                  const requiredProperties: TerminologyProperty[] = ['scopetag', 'scopedir', 'curatedir', 'vsntag'];
                  const terminology = (await mrg).terminology;
                  const missingProperties = requiredProperties.filter(prop => !terminology[prop]);

                  if (missingProperties.length > 0) {
                        log.error(`E003 Missing required property in MRG at '${mrgURL}': '${missingProperties.join("', '")}'`);
                        process.exit(1);
                  }

                  const requiredEntryProperties = ['term', 'vsntag', 'scopetag', 'locator', 'glossaryText'];
      
                  for (const entry of (await mrg).entries) {
                        // Check for missing required properties in MRG entries
                        const missingProperties = requiredEntryProperties.filter(prop => !entry[prop]);
      
                        if (missingProperties.length > 0) {
                              const lineNumber = await this.findmrgindex(mrgfile.split('\n'), entry);
                              const errorMessage = `Invalid entry in MRG at '${mrgURL}' (line ${lineNumber + 1}): missing required property: '${missingProperties.join("', '")}'`;
                              report.mrgHelp(mrgURL, lineNumber + 1, errorMessage);
      
                              // Remove the invalid entry from the MRG entries
                              (await mrg).entries.splice((await mrg).entries.indexOf(entry), 1);
                        }
                  }
            } catch (err) {
                  log.error(`E005 An error occurred while attempting to load a MRG at '${mrgURL}':`, err);
                  process.exit(1);
            }
      
            return mrg;
      }
      
      /**
       * Finds the index of an entry in a MRG file.
       * @returns A promise that resolves to the index of the entry in the MRG file.
       * @param lines The lines of the MRG file.
       * @param entry The entry to find the index of.
       * @param i The current line number.
       * @param index The possible index of the entry.
       */
      public async findmrgindex(lines: string[], entry: Entry, i: number = 0, index: number = -1): Promise<number> {
            // end of file
            if (i >= lines.length) {
                  return -1;
            }
            
            const line = lines[i];

            // marks the start or end of an entry
            if (line.startsWith('-')) {
                  // if index is not -1, then we have found the end of the entry
                  if (index !== -1) {
                        return index;
                  }
                  // if index is -1, then we have found the start of the entry
                  index = i;
                  return this.findmrgindex(lines, entry, i + 1, index);
            }

            const obj = yaml.load(line) as { [key: string]: any };

            // line matches properties of entry
            if (obj) {
                  const [key] = Object.keys(obj);
                  const value = obj[key];

                  // if the value of the property is undefined or matches the value of the property in the entry
                  if (entry[key] !== undefined && entry[key] === value) {
                        return this.findmrgindex(lines, entry, i + 1, index);
                  }
                  // if the value of the property is an array and the value of the property in the entry is included in the array
                  if (Array.isArray(entry[key])) {
                        try {
                              const len = entry[key].length;
                              if (len > 1) {
                                    for (let j = 0; j < len; j++) {
                                          i++;

                                          const line = lines[i];
                                          const obj = yaml.load(line) as { [key: string]: any };
                                          const [key2] = Object.keys(obj);
                                          const value = obj[key2];

                                          if (entry[key].includes(value)) {
                                                continue;
                                          } else {
                                                break;
                                          }
                                    }
                                    return this.findmrgindex(lines, entry, i + 1, index);
                              }
                        } catch (_err) {
                              null;
                        }
                  }
            }

            // continue searching for next entry
            return this.findmrgindex(lines, entry, i + 1);
      }

      /**
       * Populates the runtime glossary by processing MRG entries.
       * @returns A promise that resolves to the populated runtime glossary.
       */
      public async populateRuntime(mrg: MRG, filename: string): Promise<Output> {
            try {
                  const mrgEntries = mrg.entries;

                  for (const entry of mrgEntries) {
                        // Split the formPhrases string into the forms and trim each form, or set it as an empty list
                        const alternatives = entry.formPhrases ? entry.formPhrases.split(",").map(t => t.trim()) : [];

                        // Mapping of macro placeholders to their corresponding replacements
                        const regexMap: { [key: string]: string[] } = {
                              "{ss}": ["s"],
                              "{yies}": ["ys", "ies"],
                              "{ying}": ["ier", "ying", "ies", "ied"],
                        };

                        // For each alternative, check if it contains a macro
                        for (const alternative of alternatives) {
                              const match = alternative.match(/\{(ss|yies|ying)}/);
                              if (match) {
                                    const macro = match[0];
                                    const replacements = regexMap[macro];
                                    if (replacements) {
                                          // Replace the macro with each possible replacement and add the new alternative to the alternatives array
                                          for (const replacement of replacements) {
                                                alternatives.push(alternative.replace(match[0], replacement));
                                          }
                                    }
                              }
                        }

                        // add altvsntag to entry based on `altvsntags` property in the MRG file
                        // TODO: maybe only if entry.scopetag equals mrg.terminology.scopetag (same for resolved navurl), or do this in the MRGT?
                        const glossaryEntry: Entry = {
                              ...entry,
                              altvsntags: mrg.terminology.altvsntags,
                              source: filename,
                        };

                        // Add the original entry to the glossary
                        this.runtime.entries.push(glossaryEntry);

                        // Add entries of the alternative forms to the glossary
                        for (const alternative of alternatives.filter(s => !s.includes("{"))) {
                              const altEntry: Entry = { ...glossaryEntry, term: alternative };
                              this.runtime.entries.push(altEntry);
                        }
                  }
            } catch (err) {
                  log.error(`E006 An error occurred while attempting to process the MRG at '${filename}':`, err);
            } finally {
                  return this.runtime;
            }
      }
}
