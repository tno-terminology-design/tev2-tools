import { log } from './Report.js';
import { saf } from './Run.js';

import fs = require("fs");
import path = require('path');
import yaml = require('js-yaml');

interface Scope {
    website: string;
    navpath: string;
    scopetag: string;
    scopedir: string;
    curatedir: string;
    glossarydir: string;
    defaultvsn: string;
    localscopedir: string;
}

interface Scopes {
    scopetag: string;
    scopedir: string;
}

export interface Version {
    vsntag: string;
    altvsntags: string[];
    termselcrit: string[];
}

interface Terminology {
    scopetag: string;
    scopedir: string;
    curatedir: string;
    vsntag: string;
    altvsntags: string[];
}

interface Entry {
    term: string;
    vsntag: string;
    scopetag: string;
    locator: string;
    bodyFile?: string;
    synonymOf?: string;
    formPhrases?: string;
    glossaryText: string;
    navurl?: string;
    headingids?: string[];
    altvsntags?: string[];
    grouptags?: string[];
    [key: string]: any;
}

export class TuC {
    public entries: Entry[] = [];
    public scopes = new Set<Scopes>();
    public terminology = {} as Terminology;
    public synonymOfField = false;
    public filename: string;

    static instances: TuC[] = [];
    static cTextMap: Entry[] = [];

    public constructor({ vsn }: { vsn: Version}) {
        this.getTuCMap(vsn.termselcrit);

        // set relevant fields in the terminology section
        this.terminology = {
            scopetag: saf.scope.scopetag,
            scopedir: saf.scope.scopedir,
            curatedir: saf.scope.curatedir,
            vsntag: vsn.vsntag,
            altvsntags: vsn.altvsntags
        };
        
        this.filename = `mrg.${this.terminology.scopetag}.${this.terminology.vsntag}.yaml`;

        // set fields in the scopes section
        this.scopes.forEach(scope => {
            // find the corresponding scope in the SAF's scope section
            let SAFscope = saf.scopes.find(SAFscope => SAFscope.scopetag === scope.scopetag);
            if (SAFscope) {
                scope.scopedir = SAFscope.scopedir;
            } else {
                this.scopes.delete(scope);
            }
        });

        TuC.instances.push(this);
    }

    public getTuCMap(instructions: string[]): Entry[] {
        const add: string[] = [];
        const rem: string[] = [];
        const ren: string[] = [];

        instructions.forEach(instruction => {
            if (instruction.startsWith('-')) {
                // Queue removal
                rem.push(instruction.slice(1)); // Remove the leading '-'
            } else if (instruction.startsWith('rename')) {
                // Queue rename
                ren.push(instruction.slice(7)); // Remove the leading 'rename '
            } else {
                // Queue addition or selection
                add.push(instruction);
            }
        });
    
        add.forEach(this.addMrgEntry.bind(this));
        rem.forEach(this.removeMrgEntry.bind(this));
        ren.forEach(this.renameMrgEntry.bind(this));        
    
        return this.entries;
    }

    public output(): MRG {
        // create the MRG using terminology, scopes and entries and sort the entries by term
        let mrg = {
            terminology: this.terminology,
            scopes: Array.from(this.scopes),
            entries: this.entries.sort((a, b) => a.term.localeCompare(b.term))
        };

        return mrg as MRG;
    }

    private getCtextEntries(): Entry[] {
        // return cTextMap if it already exists
        if (TuC.cTextMap.length > 0) {
            return TuC.cTextMap;
        }
        const curatedir = path.join(saf.scope.localscopedir, saf.scope.curatedir);

        // Get all the curated texts from the curatedir
        let curatedirContent = fs.readdirSync(curatedir);

        // Interpret all the curated texts and store them in the terminology under construction
        let ctexts = curatedirContent.filter(ctext => ctext.endsWith('.md'));

        // load properties of curated texts as MRG Entry
        ctexts.forEach(ctext => {
            let ctextPath = path.join(curatedir, ctext);
            let ctextContent = fs.readFileSync(ctextPath, 'utf8');

            let [_, frontmatter, body] = ctextContent.split('---\n', 3);

            let ctextYAML = yaml.load(frontmatter) as Entry;

            // remove properties that match specific set of predetermined properties
            Object.keys(ctextYAML).forEach(key => {
                if (['scopetag', 'locator', 'navurl', 'headingids'].includes(key.toLowerCase())) {
                    delete ctextYAML[key];
                }
            });

            // Extract heading IDs from markdown content
            let headingIds = extractHeadingIds(body);

            if (ctextYAML.synonymOf) {
                this.synonymOfField = true;
            }
            // construct navurl from website, navpath and ctext name, or bodyFile
            const navUrl = new URL(saf.scope.website);
            if (ctextYAML.bodyFile) {
                // If the bodyFile property is set, then use that to construct the navurl
                let bodyFile = path.parse(ctextYAML.bodyFile);
                navUrl.pathname = path.join(navUrl.pathname, bodyFile.dir, bodyFile.name);
            } else {
                navUrl.pathname = path.join(navUrl.pathname, saf.scope.navpath, path.parse(ctext).name);
            }

            // add properties to MRG Entry
            ctextYAML.scopetag = saf.scope.scopetag;
            ctextYAML.locator = ctext;
            ctextYAML.navurl = navUrl.href;
            ctextYAML.headingids = headingIds;

            TuC.cTextMap.push(ctextYAML);
        });
        return TuC.cTextMap;
    }

    private addMrgEntry(instruction: string): void {
        log.trace(`\t\x1b[1;37mAdd: ${instruction}`);
        const regex = /^(?<action>.+?)(?:\[(?<items>.+?)\])?(?:@(?<scopetag>.+?))?(?::(?<vsntag>.+))?$/;
        const match = instruction.replace(/\s/g, '').match(regex);

        if (!match) {
            log.error(`\tE021 Invalid instruction: ${instruction}`);
            return undefined;
        }

        let { action, items, scopetag, vsntag } = match.groups!;

        // TODO: halt if no scopetag is specified?

        let entries = [] as Entry[];
        let mrgFile = `mrg.${scopetag}.${vsntag ?? saf.scope.defaultvsn}.yaml`;
        
        try {
            if (action === 'terms') {
                // Process terms instruction
                const termList = items.split(','); // Extract term list
                let mrgMap = new MRG({ filename: mrgFile });
                if (mrgMap.entries) {
                    entries = mrgMap.entries.filter(entry => termList.includes(entry.term));
                }
            } else if (action === 'tags') {
                // Process tags instruction
                const tagList = items.split(','); // Extract tag list
                let mrgMap = new MRG({ filename: mrgFile });
                if (mrgMap.entries) {
                    entries = mrgMap.entries.filter(entry => {
                        if (entry.grouptags) {
                            for (const tag of tagList) {
                                if (entry.grouptags.includes(tag)) {
                                    return true; // Include the entry
                                }
                            }
                        }
                        return false; // Exclude the entry
                    });
                }
            } else if (action === '*') {
                // Process wildcard instruction
                if (!scopetag || scopetag === saf.scope.scopetag) {
                    // Add all curated texts from the scope to the terminology under construction
                    entries = this.getCtextEntries();
                } else {
                    mrgFile = `mrg.${scopetag}.${vsntag ? vsntag + '.' : ''}yaml`;
                    entries = new MRG({ filename: mrgFile }).entries;
                }
            } else {
                log.error(`\tE022 Invalid term selection criteria action: ${action}`);
                return undefined;
            }
            if (entries.length > 0) {
                // add entries to TuC and overwrite existing entries with the same term
                this.entries = this.entries.filter(entry => !entries.some(e => e.term === entry.term));
                this.entries.push(...entries);
                // add scope to scopes set
                this.scopes.add({
                    scopetag: scopetag,
                    scopedir: ''
                });
            } else {
                log.warn(`\tW001 No entries found for instruction: ${instruction}`);
            }
        } catch (err) {
            log.error(err);
        }
    }

    private removeMrgEntry(instruction: string): void {
        log.trace(`\t\x1b[1;37mRemove: ${instruction}`);
        const regex = /^(?<action>.+?)(?:\[(?<items>.+?)\])?$/;
        const match = instruction.replace(/\s/g, '').match(regex);

        if (!match) {
            log.error(`\tE021 Invalid instruction: ${instruction}`);
            return undefined;
        }

        const { action, items } = match.groups!;

        if (action === 'tags') {
            // Process -tags instruction
            const tagList = items.split(','); // Extract tag list
            // Remove mrg entries from this.TuC with grouptags that match the tag list
            this.entries = this.entries.filter(entry => {
                if (entry.grouptags) {
                    for (const tag of tagList) {
                        if (entry.grouptags.includes(tag)) {
                            return false; // Exclude the entry
                        }
                    }
                }
                return true; // Keep the entry
            });
        } else if (action === 'terms') {
            // Process -terms instruction
            const termList = items.split(','); // Extract term list
            // Remove mrg entries from this.TuC with term id's that match the term list
            this.entries = this.entries.filter(entry => !termList.includes(entry.term));
        } else {
            log.error(`\tE022 Invalid term selection criteria action: ${action}`);
            return undefined;
        }
    }

    private renameMrgEntry(instruction: string): void {
        log.trace(`\t\x1b[1;37mRename: ${instruction}`);
        const parts = instruction.split(/[\s,\[\]]+/); // Split instruction into parts
        const term = parts.shift(); // Extract the term
        
        const fieldModifiers: { [key: string]: any } = {}; // Initialize an object for field modifiers

        if (parts.length === 1) {
            // If there is only one part, then it is a basic rename
            fieldModifiers.term = parts[0];
        } else if (parts.length > 1) {
            // If there are multiple parts, then it is a rename with field modifiers
            // Loop through the parts to extract field modifiers
            let key = null;
            for (const part of parts) {
                if (part.endsWith(':')) {
                    key = part.slice(0, -1); // Remove the trailing colon
                } else if (key !== null) {
                    fieldModifiers[key] = part; // Assign value to the current key
                    key = null; // Reset the key
                }
            }
        }

        // Find the entries with the term
        const entries = this.entries.filter(entry => entry.term === term);

        if (entries.length > 0) {
            // Modify the entry based on the field modifiers
            for (const entry of entries) {
                for (const [key, value] of Object.entries(fieldModifiers)) {
                    entry![key] = value;
                }
            }
        } else {
            log.warn(`\tW001 No entries found for instruction: ${instruction}`);
        }
    }
}


export class MRG {
    public filename: string;
    public terminology: Terminology;
    public scopes: Scopes[];
    public entries: Entry[] = [];

    static instances: MRG[] = [];

    public constructor({ filename }: { filename: string }) {
        const mrg = this.getMrgMap(path.join(saf.scope.localscopedir, saf.scope.glossarydir, filename));

        this.filename = filename;
        this.terminology = mrg.terminology;
        this.scopes = mrg.scopes;
        this.entries = mrg.entries;
        
        MRG.instances.push(this);
    }

    /**
     * Retrieves the MRG (Machine Readable Glossary) map.
     * @returns A promise that resolves to the MRG map.
     */
    private getMrgMap(mrgURL: string): MRG {
        let mrg = {} as MRG;

        try {
            // Try to load the MRG map from the `mrgURL`
            const mrgfile = fs.readFileSync(mrgURL, 'utf8');
            mrg = yaml.load(mrgfile) as MRG;

            // Check for missing required properties in MRG terminology
            type TerminologyProperty = keyof Terminology;
            const requiredProperties: TerminologyProperty[] = ['scopetag', 'scopedir', 'curatedir', 'vsntag'];
            const terminology = mrg.terminology;
            const missingProperties = requiredProperties.filter(prop => !terminology[prop]);

            if (missingProperties.length > 0) {
                log.error(`\tE003 Missing required property in MRG at '${mrgURL}': '${missingProperties.join("', '")}'`);
                process.exit(1);
            }
        } catch (err) {
            throw `\tE005 An error occurred while attempting to load the MRG at '${mrgURL}': ${err}`;
        }
  
        return mrg;
    }
}


export class SAF {
    public scope: Scope;
    public scopes: Scopes[];
    public versions: Version[];

    public constructor({ scopedir }: { scopedir: string }) {
        let saf = this.getSafMap(path.join(scopedir, 'saf.yaml'));

        this.scope = saf.scope;
        this.scope.localscopedir = scopedir;
        this.scopes = saf.scopes;
        this.versions = saf.versions;
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
                log.error(`\tE002 Missing required property in SAF at '${safURL}': '${missingProperties.join("', '")}'`);
                process.exit(1);
            }
            // Check if there are existing versions
            if (!saf.versions || saf.versions.length === 0) {
                log.error(`\tE003 No versions found in SAF at '${safURL}'`);
                process.exit(1);
            }
        } catch (err) {
            log.error(`\tE004 An error occurred while attempting to load the SAF at '${safURL}':`, err);
            process.exit(1);
        }

        return saf;
    }
}

/**
 * Extracts the heading IDs from the markdown content.
 * @param content The markdown content.
 * @returns An array of heading IDs.
 */
function extractHeadingIds(content: string): string[] {
    // Regular expression to match markdown headings
    const headingRegex = /^#+\s+(.*)$/gm;

    let matches;
    let headingIds: string[] = [];

    while ((matches = headingRegex.exec(content)) !== null) {
        let headingId = matches[1].replace(/\s+/g, '-').toLowerCase();
        headingIds.push(headingId);
    }

    return headingIds;
}
