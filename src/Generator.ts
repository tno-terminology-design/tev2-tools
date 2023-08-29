import { interpreter } from "./Run.js";
import { log } from './Report.js';
import { SAF, Version, MRG } from './Interpreter.js';

import fs = require("fs");
import path = require('path');
import yaml = require('js-yaml');

export class Generator {
    public vsntag: string;
    saf: SAF;

    public constructor({ vsntag }: { vsntag: string }) {
        this.vsntag = vsntag;
        this.saf = interpreter.saf;
    }

    public initialize(): void {
        log.info('Initializing generator...');

        // Check if the vsntag exists in the SAF
        if (this.vsntag) {
            const vsn = this.saf.versions.find(vsn => vsn.vsntag === this.vsntag);
            if (vsn) {
                log.info(`Processing version '${vsn.vsntag}'...`);
                this.generate(vsn);
            } else {
                // check altvsntags
                const vsn = this.saf.versions.find(vsn => vsn.altvsntags.includes(this.vsntag));

                if (vsn) {
                    log.info(`Processing version '${vsn.vsntag}' (altvsn '${this.vsntag}')...`);
                    this.generate(vsn);
                } else {
                    // TODO Run onnotexist? Seems strange to do as there is no other vsntag to process
                    throw new Error(`The specified vsntag '${this.vsntag}' was not found in the SAF`);
                }
            }
        } else {
            // If no vsntag was specified, process all versions
            log.info(`No vsntag was specified. Processing all versions...`);
            this.saf.versions.forEach(vsn => {
                log.info(`Processing version '${vsn.vsntag}'...`);
                this.generate(vsn);
            });
        }
    }

    public generate(vsn: Version): void {
        let MRG = {} as MRG;
        let glossarydir = path.join(interpreter.scopedir, this.saf.scope.glossarydir);
        // set relevant fields in the terminology section
        MRG.terminology = {
            scopetag: this.saf.scope.scopetag,
            scopedir: this.saf.scope.scopedir, // using this.saf.scope.scopedir instead of the usual interpreter.scopedir here
            curatedir: this.saf.scope.curatedir,
            vsntag: vsn.vsntag,
            altvsntags: vsn.altvsntags
        };

        // set relevant fields in the scopes section
        MRG.scopes = [];

        // add TuC entries to MRG entries
        MRG.entries = interpreter.getTuCMap(vsn.termselcrit);

        // Output the MRG to a file
        let mrgFile = `mrg.${MRG.terminology.scopetag}.${MRG.terminology.vsntag}.yaml`;
        writeFile(path.join(glossarydir, mrgFile), yaml.dump(MRG, { forceQuotes: true }));

        // Create a symlink for every altvsntag
        vsn.altvsntags.forEach(altvsntag => {
            let altmrgFile = `mrg.${MRG.terminology.scopetag}.${altvsntag}.yaml`;
            if (!fs.existsSync(path.join(glossarydir, altmrgFile))) {
                log.info(`Creating symlink for altvsntag '${altvsntag}'...`);
                fs.symlinkSync(mrgFile, path.join(glossarydir, altmrgFile));
            }
        });
    }
}

/**
 * Creates directory tree and writes data to a file.
 * @param fullPath - The full file path.
 * @param data - The data to write.
 * @param force - Whether to overwrite existing files.
 */
export function writeFile(fullPath: string, data: string, force: boolean = true) {
    const dirPath = path.dirname(fullPath);
    const file = path.basename(fullPath);
    // Check if the directory path doesn't exist
    if (!fs.existsSync(dirPath)) {
        // Create the directory and any necessary parent directories recursively
        try {
            fs.mkdirSync(dirPath, { recursive: true });
        } catch (err) {
            log.error(`  - E007 Error creating directory '${dirPath}':`, err);
            return; // Stop further execution if directory creation failed
        }
    } else if (!force && fs.existsSync(path.join(dirPath, file))) {
        return; // Stop further execution if force is not enabled and file exists
    }

    try {
        fs.writeFileSync(path.join(dirPath, file), data);
    } catch (err) {
        log.error(`  - E008 Error writing file '${path.join(dirPath, file)}':`, err);
    }
}
