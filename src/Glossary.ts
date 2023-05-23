import { Logger } from 'tslog';
import { tmpdir, version } from 'os';

import download = require('download');
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
      altvsntags: string;
}

interface Entry {
      term: string;
      vsntag: string;
      scopetag: string;
      locator: string;
      formPhrases?: string;
      glossaryText: string;
      navurl?: string;
      headingids?: string[];
      website?: string;
}

export interface Output {
      entries: Entry[];
}

export class Glossary {
      private log = new Logger();
      public vsntag?: string;
      public safURL: string;
      private mrgURL?: string;
      public saf!: Promise<SAF>;
      private mrg!: Promise<MRG>;
      public glossary: Output = {
            entries: []
      };

      public constructor({ safURL, vsntag}: { safURL: string, vsntag?: string}) {
            this.safURL = safURL;
            this.vsntag = vsntag;
      }

      public async main() {
            await this.getSafMap();
            await this.getMrgMap();
            await this.populateGlossary();

            return this.glossary
      }
      /**
       * Retrieves the SAF (Scope Administration File) map.
       * @returns A promise that resolves to the SAF map.
       */
      private async getSafMap(): Promise<SAF> {
            try {
                  // Try to load the SAF map from the safURL
                  this.saf = yaml.load(fs.readFileSync(this.safURL, 'utf8')) as Promise<SAF>;
                  this.log.info(`Loaded SAF '${this.safURL}'`);
            } catch (err) {
                  try {
                        // If the file does not exist locally, download it to the temp directory
                        const filePath = path.join(tmpdir(), `saf.yaml`);
                        this.log.info('Trying to download ' + this.safURL)

                        fs.writeFileSync(filePath, await download(this.safURL));

                        // Update the safURL to the downloaded file and recursively call getSafMap()
                        this.safURL = filePath
                        this.getSafMap();
                  } catch (err) {
                        // Log the error if the SAF download fails
                        this.log.error(err)
                        this.log.error("Failed to download SAF");
                  }
            }

            return this.saf
      }

      /**
       * Retrieves the MRG (Machine Readable Glossary) map.
       * @returns A promise that resolves to the MRG map.
       */
      private async getMrgMap(): Promise<MRG> {
            // Find the MRG inside the versions section of the SAF that matches the specified `vsntag`
            const version = (await this.saf).versions.find(version => version.vsntag === this.vsntag);

            let mrgfile: string;
            if (version) {
                  // Use the specific MRG file specified in the version if available
                  mrgfile = version.mrgfile;
            } else {
                  // If version not found, fallback to the default MRG reference in the SAF scope section
                  mrgfile = (await this.saf).scope.mrgfile;
            }

            if (mrgfile) {
                  // Construct the `mrgURL` using the SAF scope information and MRG file name <scopedir/glossarydir/mrgfile>
                  this.mrgURL = path.join((await this.saf).scope.scopedir, (await this.saf).scope.glossarydir, mrgfile)

                  try {
                        // Try to load the MRG map from the `mrgURL`
                        this.mrg = yaml.load(fs.readFileSync(this.mrgURL, 'utf8')) as Promise<MRG>;
                        this.log.info(`Loaded MRG '${this.mrgURL}'`);
                  } catch (err) {
                        try {
                              // If the file does not exist locally, download it to the temp directory
                              const filePath = path.join(tmpdir(), `mrg-mrg.yaml`);
                              this.log.info('Trying to download ' + this.mrgURL)

                              fs.writeFileSync(filePath, await download(this.mrgURL));

                              // Update the `mrgURL` to the downloaded file and recursively call getMrgMap()
                              this.mrgURL = filePath
                              this.getMrgMap();
                        } catch (err) {
                              // Log the error if the MRG download fails and return an empty MRG map
                              this.log.error("Failed to download MRG");
                              return this.mrg
                        }
                  }
            }

            return this.mrg;
      }

      /**
       * Populates the glossary by processing MRG entries.
       * @returns A promise that resolves to the populated glossary.
       */
      private async populateGlossary(): Promise<Output> {
            for (const entry of (await this.mrg).entries) {
                  if (entry.formPhrases) {
                        // Split the formPhrases string into the forms and trim each form
                        const alternatives = entry.formPhrases.split(",").map(t => t.trim());

                        // Mapping of macro placeholders to their corresponding replacements
                        const regexMap: { [key: string]: string[] } = {
                              "{ss}": ["s", "'s", "(s)"],
                              "{yies}": ["y's", "ies"],
                              "{ying}": ["ier", "ying", "ies", "ied"],
                        };


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

                        // Set the website property of the entry to the SAF scope website
                        entry.website = (await this.saf).scope.website;

                        // Add the original entry to the glossary
                        this.glossary.entries.push(entry);

                        // Add entries for the alternative forms to the glossary
                        for (const alternative of alternatives.filter(s => !s.includes("{"))) {
                              const altEntry: Entry = { ...entry, term: alternative };
                              this.glossary.entries.push(altEntry);
                        }
                  }
            }

            return this.glossary;
      }
}
