import { Interpreter } from './Interpreter.js';
import { Converter } from './Converter.js';
import { StandardInterpreter } from './StandardInterpreter.js';
import { MarkdownConverter } from './MarkdownConverter.js';
import { HTTPConverter } from './HTTPConverter.js';
import { AltInterpreter } from './AltInterpreter.js';
import { ESSIFConverter } from './ESIFFConverter.js'
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
      license: string;
      altvsntags: string;
}

interface Entry {
      term: string;
      scopetag: string;
      locator: string;
      isa: string;
      termType: string;
      formPhrases: string;
      grouptags: string;
      glossaryText: string;
      vsntag: string;
      navurl: string;
      headingids: string[];
}

export class Glossary {
      private log = new Logger();
      public vsntag?: string;
      public safURL: string;
      private mrgURL?: string;
      private saf!: Promise<SAF>;
      private mrg!: Promise<MRG>;
      public glossary: Map<string, string>;

      public constructor({ safURL, glossary, vsntag}: { safURL: string; glossary: Map<string, string>; vsntag?: string}) {
            this.safURL = safURL;
            this.vsntag = vsntag;
            this.glossary = glossary;
      }

      public async main() {
            await this.getSafMap();
            await this.getMrgMap();
            this.glossary = new Map([...this.glossary, ...await this.populateGlossary()]);
            return this.glossary
      }

      private async getSafMap() {
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

      private async populateGlossary(): Promise<Map<string, string>> {
            let glossary = new Map;
            for (const entry of (await this.mrg).entries) {

                  var alternatives: string[];

                  if (entry.formPhrases) {
                        alternatives = entry.formPhrases!.split(",");
                        alternatives.forEach(t => t.trim());
                        // todo double check the white spaces in this glossary
                        // (?<text>\w+){(?<formPhrase>ss|yies|ying)}
                        for (var alternative of alternatives) {
                              if (alternative.includes("{")) {
                                    if (alternative.includes("{ss}")) {
                                          alternatives.push(alternative.replace("{ss}", "s"));
                                          if (alternative.replace("{ss}", "")! in alternatives) {
                                                alternatives.push(alternative.replace("{ss}", ""));
                                          }
                                    } else if (alternative.includes("{yies}")) {
                                          alternatives.push(alternative.replace("{yies}", "ies"));
                                          if (alternative.replace("{yies}", "y")! in alternatives) {
                                                alternatives.push(alternative.replace("{yies}", "y"));
                                          }
                                    } else if (alternative.includes("{ying}")) {
                                          alternatives.push(alternative.replace("{ying}", "ing"));
                                          if (alternative.replace("{ying}", "y")! in alternatives) {
                                                alternatives.push(alternative.replace("{ying}", "y"));
                                          }
                                    }

                              }
                        }

                        if (this.vsntag) {
                              glossary.set(`${entry.term}@${entry.scopetag}:${this.vsntag}`, path.join((await this.saf).scope.website, entry.navurl));
                              for (var alternative of alternatives.filter(s => !s.includes("{"))) {
                                    glossary.set(`${alternative!}@${entry.scopetag}:${this.vsntag}`, path.join((await this.saf).scope.website, entry.navurl));
                              }
                        } else {
                              glossary.set(`${entry.term}@${entry.scopetag}`, path.join((await this.saf).scope.website, entry.navurl));
                              for (var alternative of alternatives.filter(s => !s.includes("{"))) {
                                    glossary.set(`${alternative!}@${entry.scopetag}`, path.join((await this.saf).scope.website, entry.navurl));
                              }
                        }
                        

                  }
            }
            return glossary;
      }
}
