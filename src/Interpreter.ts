import { log } from './Report.js';
import { saf } from './Run.js';

import matter from 'gray-matter';
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
    bodyFileID?: string;
}

interface Scopes {
    scopetag: string;
    scopedir: string;
}

export interface Version {
    vsntag: string;
    altvsntags: string[];
    termselection: string[];
}

interface Terminology {
    scopetag: string;
    scopedir: string;
    curatedir: string;
    vsntag: string;
    altvsntags: string[];
}

export interface Entry {
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
    public filename: string;
    public cText = false;

    static instances: TuC[] = [];
    static cTextMap: Entry[] = [];
    static synonymOf: Entry[] = [];

    public constructor({ vsn }: { vsn: Version }) {
        if (!vsn.termselection) {
            log.warn(`\tNo 'termselection' items found for '${vsn.vsntag}'`);
        } else {
            this.getTuCMap(vsn.termselection);
        }

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
        for (const scope of this.scopes) {
            // Check if a scope with the same scopetag already exists in this.scopes
            const existingScope = [...this.scopes].filter(s => s.scopetag === scope.scopetag);
            
            if (existingScope?.length > 1) {
                // If an existing scope is found, delete it
                this.scopes.delete(scope);
                continue;
            }
            // find the corresponding scope in the SAF's scope section
            let SAFscope = saf.scopes.find(SAFscope => SAFscope.scopetag === scope.scopetag);
            if (SAFscope) {
                scope.scopedir = SAFscope.scopedir;
            } else {
                this.scopes.delete(scope);
            }
        };

        TuC.instances.push(this);
    }

    public getTuCMap(instructions: string[]): Entry[] {
        instructions?.forEach(instruction => {
            if (instruction.startsWith('-')) {
                // Execute removal
                this.removeMrgEntry(instruction.slice(1)); // Remove the leading '-'
            } else if (instruction.startsWith('rename ')) {
                // Execute rename
                this.renameMrgEntry(instruction.slice(7)); // Remove the leading 'rename '
            } else {
                // Execute addition or selection
                this.addMrgEntry(instruction);
            }
        });      
    
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
        // signal use of curated texts
        this.cText = true;
        // return cTextMap if it already exists
        if (TuC.cTextMap.length > 0) {
            return TuC.cTextMap;
        }
        const curatedir = path.join(saf.scope.localscopedir, saf.scope.curatedir);

        // Get all the curated texts from the curatedir and their subdirectories
        let curatedirContent = [];
        const walkSync = (dir: string, filelist: string[] = []) => {
            fs.readdirSync(dir).forEach(file => {
                filelist = fs.statSync(path.join(dir, file)).isDirectory()
                    ? walkSync(path.join(dir, file), filelist)
                    : filelist.concat(path.join(dir, file));
            });
            return filelist;
        }
        curatedirContent = walkSync(curatedir);

        // Interpret all the curated texts and store them in the terminology under construction
        let ctexts = curatedirContent.filter(ctext => ctext.endsWith('.md'));

        // load properties of curated texts as MRG Entry
        ctexts?.forEach(ctext => {
            let ctextPath = ctext;
            ctext = path.relative(curatedir, ctext);

            const ctextFile = matter(fs.readFileSync(ctextPath, 'utf8'));
            let frontmatter = ctextFile.matter;
            let body = ctextFile.content;

            let ctextYAML = yaml.load(frontmatter) as Entry;

            // remove properties that match specific set of predetermined properties
            Object.keys(ctextYAML).forEach(key => {
                if (['scopetag', 'locator', 'navurl', 'headingids'].includes(key.toLowerCase())) {
                    delete ctextYAML[key];
                }
            });

            // construct navurl from website, navpath and ctext name, or bodyFile
            const navUrl = new URL(saf.scope.website);
            const pathname = navUrl.pathname;
            if (ctextYAML.bodyFile) {
                // If the bodyFile property is set, then use that to construct the navurl
                let bodyFilePath = path.parse(ctextYAML.bodyFile);
                navUrl.pathname = path.join(pathname, bodyFilePath.dir, bodyFilePath.name);
                try {
                    const bodyFile = matter(fs.readFileSync(path.join(saf.scope.localscopedir, ctextYAML.bodyFile), 'utf8'));
                    body = bodyFile.content;

                    // load properties of bodyFile
                    let bodyYAML = yaml.load(bodyFile.matter) as Entry;
                    // if the bodyFile has a `bodyFileID` property, then use that to construct the navurl
                    if (saf.scope.bodyFileID) {
                        if (bodyYAML[saf.scope.bodyFileID]) {
                            navUrl.pathname = path.join(pathname, bodyFilePath.dir, path.parse(bodyYAML[saf.scope.bodyFileID]).name);
                        }
                    }
                } catch (err) {
                    if (err instanceof Error) {
                        log.error(`\tAn error occurred while attempting to load the bodyFile '${ctextYAML.bodyFile}':`, err.message);
                    }
                }
            } else {
                navUrl.pathname = path.join(pathname, saf.scope.navpath, path.parse(ctext).dir, path.parse(ctext).name);
            }

            // Extract heading IDs from markdown content
            let headingIds = extractHeadingIds(body);

            // add properties to MRG Entry
            ctextYAML.scopetag = saf.scope.scopetag;
            ctextYAML.locator = ctext;
            ctextYAML.navurl = navUrl.href;
            ctextYAML.headingids = headingIds;

            if (ctextYAML.synonymOf) {
                TuC.synonymOf.push(ctextYAML);
            }
            TuC.cTextMap.push(ctextYAML);
        });
        return TuC.cTextMap;
    }

    private addMrgEntry(instruction: string): void {
        const regex = /^(?<key>[^\[@]+)(?:\[(?<values>.+?)?\])?(?:(?<identifier>@)(?<scopetag>[a-z0-9_-]+?)?)?(?::(?<vsntag>.+)?)?$/;
        const match = instruction.replace(/\s/g, '').match(regex);

        if (!match) {
            log.error(`\tE021 Invalid instruction: ${instruction}`);
            return undefined;
        }

        let { key, values, identifier, scopetag, vsntag } = match.groups!;
        let entries: Entry[];
        let source = ``;
        
        try {
            if (!identifier) {
                // add all terms for which there are curated texts in the current scope
                entries = this.getCtextEntries();
                source = `curated texts`
            } else {
                // add all terms in the MRG for either the current or the specified scope and version
                let mrgFile = `mrg.${scopetag ?? saf.scope.scopetag}.${vsntag ? vsntag + "." : ""}yaml`;
                let mrgMap = MRG.instances.find(mrg => mrg.filename === mrgFile) ?? new MRG({ filename: mrgFile })
                entries = mrgMap.entries;
                source = `'${mrgFile}'`;
            }

            const valuelist = values?.split(',').map(v => v.trim());
            
            if (key !== '*') {
                entries = entries.filter(entry => {
                    // if the entry has a field with the same name as the key
                    if (entry[key] !== undefined) {
                        // and both the values list and key entry property is empty
                        if (!values && (entry[key] === '' || entry[key] === null)) {
                            return true;    // then include the entry
                        } else if (!entry[key]) {   // if the entry[key] is undefined
                            return false;   // then exclude the entry
                        }
                        // or the value of that field is in the values list
                        for (const value of valuelist) {
                            if (typeof entry[key] === 'string') {   // if the entry[key] is a string
                                if (entry[key] === value) {
                                    return true;    // then include the entry
                                }
                            } else {
                                if (entry[key].includes(value)) {   // if the entry[key] is an array
                                    return true;    // then include the entry
                                }
                            }
                        }
                    }
                    // else, exclude the entry
                    return false;
                });
            }
            instruction = `${key}${valuelist ? '[' + valuelist?.join(', ') + ']' : ''}${identifier ? '@' + scopetag + (vsntag ? ':' + vsntag : '') : ''}`;
            if (entries.length > 0) {
                // add entries to TuC and overwrite existing entries with the same term
                this.entries = this.entries.filter(entry => !entries.some(e => e.term === entry.term));
                this.entries.push(...entries);
                // add scope to scopes set
                this.scopes.add({
                    scopetag: scopetag,
                    scopedir: ''
                });
                log.trace(`\tAdded ${entries.length} entr${entries.length > 1 ? 'ies' : 'y'} from ${source}: \t${instruction}`);
            } else {
                log.warn(`\tAdded 0 entries from ${source}: \t${instruction}`);
            }
        } catch (err) {
            if (err instanceof Error) {
                log.error(`\tInstruction caused an error: \t${instruction}`);
                log.error(`\t${err.message}`)
            }
        }
    }

    private removeMrgEntry(instruction: string): void {
        const regex = /^(?<key>[^\[]+)(?:\[(?<values>.+?)?\])?$/;
        const match = instruction.replace(/\s/g, '').match(regex);

        if (!match) {
            log.error(`\tE021 Invalid instruction: ${instruction}`);
            return undefined;
        }

        const { key, values } = match.groups!;
        let removeCount = 0;
        const valuelist = values?.split(',').map(v => v.trim());

        try {
            this.entries = this.entries.filter(entry => {
                // if the entry has a field with the same name as the key
                if (entry[key] !== undefined) {
                    // and both the values list and key entry property is empty
                    if (!values && (entry[key] === '' || entry[key] === null)) {
                        removeCount++;
                        return false;
                    } else if (!entry[key]) {
                        return true;
                    }
                    // or the value of that field is in the value list
                    for (const value of valuelist) {
                        if (typeof entry[key] === 'string') {   // if the entry[key] is a string
                            if (entry[key] === value) {
                                removeCount++;
                                return false;    // then exclude the entry
                            }
                        } else {
                            if (entry[key].includes(value)) {   // if the entry[key] is an array
                                removeCount++;
                                return true;    // then exclude the entry
                            }
                        }
                    }
                }
                // else, keep the entry
                return true;
            });

            // log warning if no entries were removed
            instruction = `${key}[${valuelist?.join(', ')}]`;
            if (removeCount === 0) {
                log.warn(`\tRemoved 0 entries: \t-${instruction}`)
            } else {
                log.trace(`\tRemoved ${removeCount} entr${removeCount > 1 ? 'ies' : 'y'}: \t-${instruction}`);
            }
        } catch (err) {
            if (err instanceof Error) {
                log.error(`\tInstruction caused an error: \t-${instruction}`);
                log.error(`\t${err.message}`)
            }
        }
    }

    private renameMrgEntry(instruction: string): void {
        const regex = /^(?<term>[^\[]+)(?:\[(?<fieldmodifierlist>.+?)?\])?$/;
        const match = instruction.match(regex);
    
        if (!match) {
            log.error(`\tE021 Invalid instruction: ${instruction}`);
            return undefined;
        }
    
        let { term, fieldmodifierlist } = match.groups!; // Extract the term and the field modifier list
        term = term.trim(); // Remove leading and trailing whitespace
        const fieldModifiers: { [key: string]: any } = {}; // Initialize an object for field modifiers
        let modifierString: string[] = [];
    
        try {
            if (fieldmodifierlist) {
                // Use a regular expression to capture the key-value pairs in the fieldmodifierlist
                const keyValueRegex = /[\s,]*([^:]+)\s*:\s*((["'`])(.*?)\3|[^,]+)\s*/g;
                let keyValueMatch;
        
                // Extract the key-value pairs from the field modifier list
                while ((keyValueMatch = keyValueRegex.exec(fieldmodifierlist))) {
                    // remove leading and trailing whitespace
                    const key = keyValueMatch[1];
                    const value = keyValueMatch[4] ?? keyValueMatch[2];
                    fieldModifiers[key] = value;
                    modifierString.push(`${key}: ${value}`);
                }
            }
        
            // Find the entries with the term
            const entries = this.entries.filter(entry => entry.term === term);
            let renameCount = 0;
        
            if (entries?.length > 0) {
                // Modify the entry based on the field modifiers
                for (const entry of entries) {
                    let mod = false;
                    for (const [key, value] of Object.entries(fieldModifiers)) {
                        entry[key] = value;
                        mod = true;
                    }
                    mod && renameCount++;
                }
            }
            instruction = `rename ${term} [${modifierString?.join(', ')}]`;
            if (renameCount === 0) {
                log.warn(`\tRenamed 0 entries: \t${instruction}`);
            } else {
                log.trace(`\tRenamed ${renameCount} entr${renameCount > 1 ? 'ies' : 'y'}: \t${instruction}`);
            }
        } catch (err) {
            if (err instanceof Error) {
                log.error(`\tInstruction caused an error: \t${instruction}`);
                log.error(`\t${err.message}`)
            }
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
            if (err instanceof Error) {
                err.message = `E005 An error occurred while attempting to load the MRG at '${mrgURL}': ${err}`;
            }
            throw err;
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
