import { log } from './Report.js';

import fs = require("fs");
import path = require('path');
import yaml = require('js-yaml');

export interface SAF {
    scope: Scope;
    scopes: Scopes[];
    versions: Version[];
}

interface Scope {
    website: string;
    navpath: string;
    scopetag: string;
    scopedir: string;
    curatedir: string;
    glossarydir: string;
    defaultvsn: string;
    mrgfile: string;
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

export interface MRG {
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

export class Interpreter {
    public scopedir: string;
    public scopes!: Set<Scopes>;
    public saf!: SAF;
    public TuC!: Entry[];

    public constructor({ scopedir }: { scopedir: string }) {
        this.scopedir = scopedir;
        this.scopes = new Set<Scopes>();
        this.TuC = [] as Entry[];
        this.saf = this.getSafMap(path.join(this.scopedir, 'saf.yaml'));
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
    
        return this.TuC;
    }
    

    private getCtextEntries(): Entry[] {
        let cTextMap: Entry[] = [];
        const curatedir = path.join(this.scopedir, this.saf.scope.curatedir);

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
            
            // // TODO: Check if a synonym is referred to that should be used instead
            // if (ctextYAML.synonymOf) {
            //     // find the ctext in ctexts that matches the synonymOf
            //     let synonymOfCtext = ctexts.find(_ => path.parse(ctextPath).name === ctextYAML.synonymOf!);

            //     // if the synonymOfCtext exists, then load its properties as MRG Entry
            //     if (synonymOfCtext) {
            //         ctextPath = path.join(curatedir, ctext);
            //         ctextContent = fs.readFileSync(ctextPath, 'utf8');

            //         [_, frontmatter, body] = ctextContent.split('---\n', 3);

            //         ctextYAML = yaml.load(frontmatter) as Entry;
            //     }
            // }

            // Extract heading IDs from markdown content
            let headingIds = this.extractHeadingIds(body);

            // remove properties that match specific set of predetermined properties
            Object.keys(ctextYAML).forEach(key => {
                if (['scopetag', 'locator', 'navurl', 'headingids'].includes(key.toLowerCase())) {
                    delete ctextYAML[key];
                }
            });

            // construct navurl from website, navpath, and ctext name
            const navUrl = new URL(this.saf.scope.website);
            navUrl.pathname = path.join(navUrl.pathname, path.join(this.saf.scope.navpath, path.parse(ctext).name));

            // add properties to MRG Entry
            ctextYAML.scopetag = this.saf.scope.scopetag;
            ctextYAML.locator = ctext;
            ctextYAML.navurl = navUrl.href;
            ctextYAML.headingids = headingIds;

            cTextMap.push(ctextYAML);
        });
        return cTextMap;
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
        let mrgFile = path.join(this.scopedir, this.saf.scope.glossarydir, `mrg.${scopetag}.${vsntag ?? this.saf.scope.defaultvsn}.yaml`);
        
        try {
            if (action === 'terms') {
                // Process terms instruction
                const termList = items.split(','); // Extract term list
                let mrgMap = this.getMrgMap(mrgFile);
                if (mrgMap.entries) {
                    entries = mrgMap.entries.filter(entry => termList.includes(entry.term));
                }
            } else if (action === 'tags') {
                // Process tags instruction
                const tagList = items.split(','); // Extract tag list
                let mrgMap = this.getMrgMap(mrgFile);
                if (mrgMap.entries) {
                    entries = mrgMap.entries.filter(entry => entry.grouptags?.some(tag => tagList.includes(tag)));
                }
            } else if (action === '*') {
                // Process wildcard instruction
                if (!scopetag || scopetag === this.saf.scope.scopetag) {
                    // Add all curated texts from the scope to the terminology under construction
                    entries = this.getCtextEntries();
                } else {
                    // TODO: How do we determine the default version?
                    mrgFile = path.join(this.scopedir, this.saf.scope.glossarydir, `mrg.${scopetag}.${vsntag ?? this.saf.scope.defaultvsn}.yaml`);
                    entries = this.getMrgMap(mrgFile).entries;
                }
            } else {
                log.error(`\tE022 Invalid term selection criteria action: ${action}`);
                return undefined;
            }
            if (entries.length > 0) {
                // add entries to TuC
                this.TuC.push(...entries);
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
            this.TuC = this.TuC.filter(entry => {
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
            this.TuC = this.TuC.filter(entry => !termList.includes(entry.term));
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
        const entries = this.TuC.filter(entry => entry.term === term);

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

    /**
     * Extracts the heading IDs from the markdown content.
     * @param content The markdown content.
     * @returns An array of heading IDs.
     */
    private extractHeadingIds(content: string): string[] {
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

            const requiredEntryProperties = ['term', 'vsntag', 'scopetag', 'locator', 'glossaryText'];

            for (const entry of mrg.entries) {
                // add vsntag and scopetag from source MRG to MRG entries
                entry.vsntag = terminology.vsntag;
                entry.scopetag = terminology.scopetag;

                // Check for missing required properties in MRG entries
                const missingProperties = requiredEntryProperties.filter(prop => !entry[prop]);

                if (missingProperties.length > 0) {
                    // Create a reference to the problematic entry using the first three property-value pairs
                    const reference = Object.keys(entry).slice(0, 3).map(prop => `${prop}: '${entry[prop]}'`).join(', ');

                    log.warn(`\tE004 MRG entry missing required property: '${missingProperties.join("', '")}'. Entry starts with values ${reference}`);
                }
            }
        } catch (err) {
            throw `\tE005 An error occurred while attempting to load the MRG at '${mrgURL}': ${err}`;
        }
  
        return mrg;
    }
}