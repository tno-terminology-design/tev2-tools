import { log } from './Report.js';
import { Entry } from './Generator.js';

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
        const rem = [] as string[];
    
        instructions.forEach(instruction => {
            if (instruction.startsWith('-')) {
                // Queue removal
                rem.push(instruction.slice(1)); // Remove the leading '-'
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
    
        return this.TuC;
    }
    

    private getCtextMap(): void {
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
            // ctextYAML.navurl = path.join(this.saf.scope.scopetag, ctext); // TODO: Check if this is needed
            ctextYAML.headingids = headingIds;

            this.TuC.push(ctextYAML);
        });
    }

    private addMrgEntry(instruction: string): void {
        const parts = instruction.split(/\s+/); // Split instruction into parts
        const action = parts.shift(); // Extract the action (e.g., 'terms', 'tags', '*')
        if (action?.startsWith('terms')) {
            // Process terms instruction
            const termList = parts[0].slice(1, -1).split(','); // Extract term list
            const scopeVersion = parts[1]?.split(':'); // Extract scope and version
            // Logic to retrieve and add MRG entries based on terms
        } else if (action?.startsWith('tags')) {
            // Process tags instruction
            const tagList = parts[0].slice(1, -1).split(','); // Extract tag list
            const scopeVersion = parts[1]?.split(':'); // Extract scope and version
            // Logic to retrieve and add MRG entries based on tags
        } else if (action?.startsWith('*')) {
            // Process wildcard instruction
            const scopetag = parts[0]?.slice(1); // Extract scope
            if (!scopetag || scopetag === this.saf.scope.scopetag) {
                // Add all curated texts from the scope to the terminology under construction
                this.getCtextMap();
            }
            // Logic to retrieve and add all MRG entries from the scope
        }
    }
    

    private removeMrgEntry(instruction: string): void {
        const parts = instruction.split(/\s+/); // Split instruction into parts
        const action = parts.shift(); // Extract the action (e.g., 'tags', 'terms')
        if (action === 'tags') {
            // Process -tags instruction
            const tagList = parts[0].slice(1, -1).split(','); // Extract tag list
            // Logic to remove MRG entries based on tags
        } else if (action === 'terms') {
            // Process -terms instruction
            const termList = parts[0].slice(1, -1).split(','); // Extract term list
            // Logic to remove MRG entries based on terms
        }
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
}