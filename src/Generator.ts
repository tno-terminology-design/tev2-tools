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
                log.info(`\x1b[1;37mProcessing version '${vsn.vsntag}'...`);
                this.generate(vsn);
            } else {
                // check altvsntags
                const vsn = this.saf.versions.find(vsn => vsn.altvsntags.includes(this.vsntag));

                if (vsn) {
                    log.info(`\x1b[1;37mProcessing version '${vsn.vsntag}' (altvsn '${this.vsntag}')...`);
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
                log.info(`\x1b[1;37mProcessing version '${vsn.vsntag}'...`);
                this.generate(vsn);
            });
        }
    }

    public generate(vsn: Version): void {
        let MRG = {} as MRG;
        let glossarydir = path.join(interpreter.scopedir, this.saf.scope.glossarydir);

        // run interpreter to get TuC
        interpreter.getTuCMap(vsn.termselcrit);

        // set relevant fields in the terminology section
        MRG.terminology = {
            scopetag: this.saf.scope.scopetag,
            scopedir: this.saf.scope.scopedir,
            curatedir: this.saf.scope.curatedir,
            vsntag: vsn.vsntag,
            altvsntags: vsn.altvsntags
        };

        // set fields in the scopes section
        MRG.scopes = [];
        interpreter.scopes.forEach(scope => {
            // find the corresponding scope in the SAF's scope section
            let SAFscope = this.saf.scopes.find(SAFscope => SAFscope.scopetag === scope.scopetag);
            if (SAFscope) {
                scope.scopedir = SAFscope.scopedir;
                MRG.scopes.push(scope);
            }
        });

        // add TuC entries to entries section
        MRG.entries = interpreter.TuC;

        // Output the MRG to a file
        let mrgFile = `mrg.${MRG.terminology.scopetag}.${MRG.terminology.vsntag}.yaml`;
        writeFile(path.join(glossarydir, mrgFile), yaml.dump(MRG, { forceQuotes: true }));

        // if the version is the default version, create a symbolic link
        if (this.saf.scope.defaultvsn === MRG.terminology.vsntag) {
            let defaultmrgFile = `mrg.${MRG.terminology.scopetag}.yaml`;
            let defaultmrgURL = path.join(glossarydir, defaultmrgFile);
            log.info(`\tCreating symlink for default version '${vsn.vsntag}'`);
            if (!fs.existsSync(defaultmrgURL)) {
                fs.symlinkSync(mrgFile, defaultmrgURL);
            } else {
                // overwrite existing symlink
                fs.unlinkSync(defaultmrgURL);
                fs.symlinkSync(mrgFile, defaultmrgURL);
            }
        }

        // Create a symlink for every altvsntag
        vsn.altvsntags.forEach(altvsntag => {
            let altmrgFile = `mrg.${MRG.terminology.scopetag}.${altvsntag}.yaml`;
            let altmrgURL = path.join(glossarydir, altmrgFile);
            log.info(`\tCreating symlink for altvsntag '${altvsntag}'`);
            if (!fs.existsSync(altmrgURL)) {
                fs.symlinkSync(mrgFile, altmrgURL);
            } else {
                // overwrite existing symlink
                fs.unlinkSync(altmrgURL);
                fs.symlinkSync(mrgFile, altmrgURL);
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
            log.error(`\tE007 Error creating directory '${dirPath}':`, err);
            return; // Stop further execution if directory creation failed
        }
    } else if (!force && fs.existsSync(path.join(dirPath, file))) {
        return; // Stop further execution if force is not enabled and file exists
    }

    try {
        fs.writeFileSync(path.join(dirPath, file), data);
    } catch (err) {
        log.error(`\tE008 Error writing file '${path.join(dirPath, file)}':`, err);
    }
}
