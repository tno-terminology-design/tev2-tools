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

      private async getSafMap(): Promise<SAF> {
            try {
                  this.saf = yaml.load(fs.readFileSync(this.safURL, 'utf8')) as Promise<SAF>;
            } catch (err) {
                  try {
                        // If file does not exist locally, download it to tmpdir
                        const filePath = path.join(tmpdir(), `saf.yaml`);
                        this.log.debug('Trying to download ' + this.safURL)

                        fs.writeFileSync(filePath, await download(this.safURL));
                        this.log.info(`SAF loaded: ${filePath}`);

                        this.safURL = filePath
                        this.getSafMap();
                  } catch (err) {
                        this.log.error(err)
                        this.log.error("Failed to download SAF");
                  }
            }
      return this.saf
      }

      private async getMrgMap(): Promise<MRG> {
            const version = (await this.saf).versions.find(version => version.vsntag === this.vsntag);

            let mrgfile: string;
            if (version) {
                  mrgfile = version.mrgfile;
            } else {
                  mrgfile = (await this.saf).scope.mrgfile;
            }

            if (mrgfile) {
                  this.mrgURL = path.join((await this.saf).scope.scopedir, (await this.saf).scope.glossarydir, mrgfile)

                  try {
                        this.mrg = yaml.load(fs.readFileSync(this.mrgURL, 'utf8')) as Promise<MRG>;
                  } catch (err) {
                        try {
                              // If file does not exist locally, download it to tmpdir
                              const filePath = path.join(tmpdir(), `mrg-mrg.yaml`);
                              this.log.debug('Trying to download ' + this.mrgURL)

                              fs.writeFileSync(filePath, await download(this.mrgURL));
                              this.log.info(`MRG loaded: ${filePath}`);

                              this.mrgURL = filePath
                              this.getMrgMap();
                        } catch (err) {
                              this.log.error("Failed to download MRG");
                              return this.mrg
                        }
                  }
            }
      return this.mrg;
      }

      private async populateGlossary(): Promise<Output> {
            for (const entry of (await this.mrg).entries) {

                  var alternatives: string[];

                  if (entry.formPhrases) {
                        alternatives = entry.formPhrases!.split(",");
                        alternatives.forEach(t => t.trim());
                        // (?<Text>\w+){(?<Macro>ss|yies|ying)}
                        this.log.debug(alternatives)
                        for (var alternative of alternatives) {
                              this.log.debug(alternative)
                              if (alternative.includes("{")) {
                                    if (alternative.includes("{ss}")) {
                                          alternatives.push(alternative.replace("{ss}", "s"));
                                          alternatives.push(alternative.replace("{ss}", "'s"));
                                          alternatives.push(alternative.replace("{ss}", "(s)"));
                                          if (alternative.replace("{ss}", "")! in alternatives) {
                                                alternatives.push(alternative.replace("{ss}", ""));
                                          }
                                    } else if (alternative.includes("{yies}")) {
                                          alternatives.push(alternative.replace("{yies}", "y's"));
                                          alternatives.push(alternative.replace("{yies}", "ies"));
                                          if (alternative.replace("{yies}", "y")! in alternatives) {
                                                alternatives.push(alternative.replace("{yies}", "y"));
                                          }
                                    } else if (alternative.includes("{ying}")) {
                                          alternatives.push(alternative.replace("{ying}", "ier"));
                                          alternatives.push(alternative.replace("{ying}", "ying"));
                                          alternatives.push(alternative.replace("{ying}", "ies"));
                                          alternatives.push(alternative.replace("{ying}", "ied"));
                                          if (alternative.replace("{ying}", "y")! in alternatives) {
                                                alternatives.push(alternative.replace("{ying}", "y"));
                                          }
                                    }

                              }
                        }
                        entry.website = (await this.saf).scope.website;
                        this.glossary.entries.push(entry);

                        for (var alternative of alternatives.filter(s => !s.includes("{"))) {
                              const altEntry: Entry = { ...entry, term: alternative };
                              this.glossary.entries.push(altEntry)
                        }
                  }
            }
            this.log.debug(this.glossary);
            return this.glossary;
      }
}
