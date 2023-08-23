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
    scopetags: string[];
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
    public saf!: SAF;
    public TuC!: Entry[];

    public constructor({ scopedir }: { scopedir: string }) {
        this.scopedir = scopedir;
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
                log.error(`E002 Missing required property in SAF at '${safURL}': '${missingProperties.join("', '")}'`);
                process.exit(1);
            }
            // Check if there are existing versions
            if (!saf.versions || saf.versions.length === 0) {
                log.error(`E003 No versions found in SAF at '${safURL}'`);
                process.exit(1);
            }
        } catch (err) {
            log.error(`E004 An error occurred while attempting to load the SAF at '${safURL}':`, err);
            process.exit(1);
        }

        return saf;
    }

    public getTuCMap(instructions: string[]): Entry[] {
        const add = [] as string[];
        const ren = [] as string[];
        const rem = [] as string[];
    
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
    
        // Process additions
        add.forEach(instruction => {
            this.addMrgEntry(instruction);
        });
    
        // Process removals
        rem.forEach(instruction => {
            this.removeMrgEntry(instruction);
        });

        // Process renames
        rem.forEach(instruction => {
            this.renameMrgEntry(instruction);
        });
    
        return this.TuC;
    }
    

    private getCtextEntries(): Entry[] {
        let cTextMap = {} as Entry[];
        const curatedir = path.join(this.scopedir, this.saf.scope.curatedir);

        // Get all the curated texts from the curatedir
        let curatedirContent = fs.readdirSync(curatedir);

        // Interpret all the curated texts and store them in the terminology under construction
        let ctexts = curatedirContent.filter(ctext => ctext.endsWith('.md'));

        // load properties of curated texts as MRG Entry
        ctexts.forEach(ctext => {
            let ctextPath = path.join(curatedir, ctext);
            let ctextContent = fs.readFileSync(ctextPath, 'utf8');

            const [_, frontmatter, body] = ctextContent.split('---\n', 3);

            let ctextYAML = yaml.load(frontmatter) as Entry;
            
            // TODO: Check if another body is refered to that should be used instead

            // Extract heading IDs from markdown content
            let headingIds = this.extractHeadingIds(body);

            // remove properties that match specific set of predetermined properties
            Object.keys(ctextYAML).forEach(key => {
                if (['scopetag', 'locator', 'navurl', 'headingids'].includes(key.toLowerCase())) {
                    delete ctextYAML[key];
                }
            });
            ctextYAML.scopetag = this.saf.scope.scopetag;
            ctextYAML.locator = ctext;
            ctextYAML.navurl = path.join(this.saf.scope.website, this.saf.scope.navpath, path.parse(ctext).name);
            ctextYAML.headingids = headingIds;

            cTextMap.push(ctextYAML);
        });
        return cTextMap;
    }

    private addMrgEntry(instruction: string): void {
        let entries = [] as Entry[];
        const parts = instruction.split(/[\s,]+/); // Split instruction into parts
        const action = parts.shift(); // Extract the action (i.e., 'terms', 'tags', '*')
        if (action?.startsWith('terms')) {
            // Process terms instruction
            const termList = parts[0].slice(1, -1).split(','); // Extract term list
            const [scopetag, vsntag] = parts[1]?.split(':'); // Extract scope and version
            
            let mrgFile = path.join(this.scopedir, this.saf.scope.glossarydir, `mrg.${scopetag}.${vsntag ?? this.saf.scope.defaultvsn}.yaml`);
            entries = this.getMrgMap(mrgFile).entries.filter(entry => termList.includes(entry.term));
        } else if (action?.startsWith('tags')) {
            // Process tags instruction
            const tagList = parts[0].slice(1, -1).split(','); // Extract tag list
            const [scopetag, vsntag] = parts[1]?.split(':'); // Extract scope and version

            let mrgFile = path.join(this.scopedir, this.saf.scope.glossarydir, `mrg.${scopetag}.${vsntag ?? this.saf.scope.defaultvsn}.yaml`);
            entries = this.getMrgMap(mrgFile).entries.filter(entry => entry.grouptags?.some(tag => tagList.includes(tag)));
        } else if (action?.startsWith('*')) {
            // Process wildcard instruction
            const [scopetag, vsntag] = parts[1]?.split(':'); // Extract scope and version
            if (!scopetag || scopetag === this.saf.scope.scopetag) {
                // Add all curated texts from the scope to the terminology under construction
                entries = this.getCtextEntries();
            } else {
                // TODO: How do we determine the default version?
                let mrgFile = path.join(this.scopedir, this.saf.scope.glossarydir, `mrg.${scopetag}.${vsntag ?? this.saf.scope.defaultvsn}.yaml`);
                entries = this.getMrgMap(mrgFile).entries;
            }
        }
        this.TuC.push(...entries);
    }

    private removeMrgEntry(instruction: string): void {
        const parts = instruction.split(/[\s,]+/); // Split instruction into parts
        const action = parts.shift(); // Extract the action (i.e., 'tags', 'terms')
        if (action === 'tags') {
            // Process -tags instruction
            const tagList = parts[0].slice(1, -1).split(','); // Extract tag list
            // Remove mrg entries from this.TuC with grouptags that match the tag list
            this.TuC = this.TuC.filter(entry => !entry.grouptags?.some(tag => tagList.includes(tag)));
        } else if (action === 'terms') {
            // Process -terms instruction
            const termList = parts[0].slice(1, -1).split(','); // Extract term list
            // Remove mrg entries from this.TuC with term id's that match the term list
            this.TuC = this.TuC.filter(entry => !termList.includes(entry.term));
        }
    }

    private renameMrgEntry(instruction: string): void {
        const parts = instruction.split(/[\s,\[\]]+/).filter(Boolean); // Split instruction into parts
        const term = parts.shift(); // Extract the term
        
    }
    

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
                log.error(`E003 Missing required property in MRG at '${mrgURL}': '${missingProperties.join("', '")}'`);
                process.exit(1);
            }

            const requiredEntryProperties = ['term', 'vsntag', 'scopetag', 'locator', 'glossaryText'];

            for (const entry of mrg.entries) {
                // add vsntag, scopetag, and altvsntags from MRG to MRG entries
                entry.vsntag = terminology.vsntag;
                entry.scopetag = terminology.scopetag;
                entry.altvsntags = terminology.altvsntags

                // Check for missing required properties in MRG entries
                const missingProperties = requiredEntryProperties.filter(prop => !entry[prop]);

                if (missingProperties.length > 0) {
                    // Create a reference to the problematic entry using the first three property-value pairs
                    const reference = Object.keys(entry).slice(0, 3).map(prop => `${prop}: '${entry[prop]}'`).join(', ');

                    const errorMessage = `MRG entry missing required property: '${missingProperties.join("', '")}'. Entry starts with values ${reference}`;
                    // report.mrgHelp(mrgURL, -1, errorMessage);
                }
            }
        } catch (err) {
            const errorMessage = `E005 An error occurred while attempting to load an MRG: ${err}`;
            //   report.mrgHelp(mrgURL, -1, errorMessage);
        }
  
        return mrg;
    }
}