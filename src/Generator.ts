import { interpreter } from "./Run.js";
import { log } from './Report.js';
import { SAF, Version } from './Interpreter.js';

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

interface Scopes {
    scopetag: string;
    scopedir: string;
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
        // set relevant fields in the terminology section
        MRG.terminology = {
            scopetag: this.saf.scope.scopetag,
            scopedir: this.saf.scope.scopedir,
            curatedir: this.saf.scope.curatedir,
            vsntag: vsn.vsntag,
            altvsntags: vsn.altvsntags
        };

        // Find all the curated texts that are relevant for this version
        log.debug(`termselcrit: ${vsn.termselcrit}`);
        
        // Copy entries from existing MRG


        // For every tuple in this set, an MRG entry is created, and added to the MRG under construction. The structure of each such entry depends on the type of the knowledge artifact that the term represents, as the header of a curated text depends on that type.
    }
}