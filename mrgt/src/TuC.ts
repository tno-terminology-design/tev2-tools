import { log, regularize, mappings } from "@tno-terminology-design/utils"
import { MRG, SAF } from "@tno-terminology-design/utils"

import matter from "gray-matter"
import fs = require("fs")
import path = require("path")

const valueUsed = new Set<string>()

interface TuC {
  terminology: MRG.Terminology
  scopes: Set<SAF.Scopes>
  entries: MRG.Entry[]
  filename: string
  cText: boolean
}

/**
 * The TuCBuilder class handles the construction of the terminology under construction.
 * The `resolveInstructions` method is called by the constructor to start the construction process.
 * The `saf` parameter is used to specify the SAF.
 * The `vsn` parameter is used to specify the version.
 */
export class TuCBuilder {
  static instances: TuCBuilder[] = []
  static cTextMap: MRG.Entry[] = []
  static synonymOf: MRG.Entry[] = []

  saf: SAF.Type
  tuc: TuC

  public constructor({ vsn, saf }: { vsn: SAF.Version; saf: SAF.Type }) {
    this.saf = saf
    this.tuc = {
      terminology: {
        ...saf.scope,
        vsntag: vsn.vsntag,
        altvsntags: vsn.altvsntags
      },
      scopes: new Set<SAF.Scopes>(),
      entries: [],
      filename: `mrg.${saf.scope.scopetag}.${vsn.vsntag}.yaml`,
      cText: false
    }

    if (!vsn.termselection) {
      log.warn(`\tNo 'termselection' items found for '${vsn.vsntag}'`)
    } else {
      this.resolveInstructions(vsn.termselection)
    }

    // set fields in the scopes section
    for (const scope of this.tuc.scopes) {
      // Check if a scope with the same scopetag already exists in this.scopes
      const existingScope = [...this.tuc.scopes].filter((s) => s.scopetag === scope.scopetag)

      if (existingScope?.length > 1) {
        // If an existing scope is found, delete it
        this.tuc.scopes.delete(scope)
        continue
      }
      // find the corresponding scope in the SAF's scope section
      const SAFscope = this.saf.scopes?.find((SAFscope: { scopetag: string }) => SAFscope.scopetag === scope.scopetag)
      if (SAFscope) {
        scope.scopedir = SAFscope.scopedir
      } else {
        this.tuc.scopes.delete(scope)
      }
    }

    TuCBuilder.instances.push(this)
  }

  public resolveInstructions(instructions: string[]): MRG.Entry[] {
    instructions?.forEach((instruction) => {
      if (instruction.startsWith("-")) {
        // Execute removal
        this.removeMrgEntry(instruction.slice(1)) // Remove the leading '-'
      } else if (instruction.startsWith("rename ")) {
        // Execute rename
        this.renameMrgEntry(instruction.slice(7)) // Remove the leading 'rename '
      } else {
        // Execute addition or selection
        this.addMrgEntry(instruction)
      }
    })

    return this.tuc.entries
  }

  public output(): MRG.Type {
    // create the MRG using terminology, scopes and entries and sort the entries by term
    const mrg = {
      terminology: this.tuc.terminology,
      scopes: Array.from(this.tuc.scopes),
      entries: this.tuc.entries.sort((a, b) => a.term.localeCompare(b.term))
    }
    delete mrg.terminology.localscopedir
    for (const entry of mrg.entries) {
      entry.vsntag = entry.vsntag ?? this.tuc.terminology.vsntag
      entry.termid = `${entry.termType ?? this.saf.scope.defaulttype}:${entry.term}`
    }

    return mrg as MRG.Type
  }

  private getCtextEntries(): MRG.Entry[] {
    this.tuc.cText = true // signal use of curated texts
    if (TuCBuilder.cTextMap.length > 0) {
      return TuCBuilder.cTextMap // return cTextMap if it already exists
    }
    const curatedir = path.join(this.saf.scope.localscopedir, this.saf.scope.curatedir)

    // Get all the curated texts from the curatedir and their subdirectories
    let curatedirContent = []
    const walkSync = (dir: string, filelist: string[] = []) => {
      fs.readdirSync(dir).forEach((file) => {
        filelist = fs.statSync(path.join(dir, file)).isDirectory()
          ? walkSync(path.join(dir, file), filelist)
          : filelist.concat(path.join(dir, file))
      })
      return filelist
    }
    curatedirContent = walkSync(curatedir)

    // Interpret all the curated texts and store them in the terminology under construction
    const ctexts = curatedirContent.filter((ctext) => ctext.endsWith(".md"))
    for (let ctext of ctexts) {
      try {
        const ctextPath = ctext
        ctext = path.relative(curatedir, ctext)

        const ctextFile = matter(fs.readFileSync(ctextPath, "utf8"))
        let body = ctextFile.content

        const ctextYAML = ctextFile.data as MRG.Entry

        Object.keys(ctextYAML).forEach((key) => {
          // regularize all term and termType  properties
          if (["term", "termType"].includes(key.toLowerCase())) {
            ctextYAML[key] = regularize(ctextYAML[key].toString())
          }

          // remove properties that match specific set of predetermined properties
          if (["scopetag", "vsntag", "locator", "navurl", "headingids", "termid"].includes(key.toLowerCase())) {
            delete ctextYAML[key]
          }
        })

        if (!ctextYAML.term) {
          throw new Error(`The frontmatter does not include a valid 'term' property`)
        }

        // construct navurl from website, navpath and ctext name, or bodyFile
        const navUrl = new URL(this.saf.scope.website)
        const pathname = navUrl.pathname

        if (ctextYAML.bodyFile) {
          // If the bodyFile property is set, then use that to construct the navurl
          const bodyFilePath = path.parse(ctextYAML.bodyFile)
          navUrl.pathname = path.join(pathname, bodyFilePath.dir, bodyFilePath.name)
          try {
            const bodyFile = matter(
              fs.readFileSync(path.join(this.saf.scope.localscopedir, ctextYAML.bodyFile), "utf8")
            )
            body = bodyFile.content

            // if the bodyFile has a `navid` property, then use that to construct the navurl
            if (this.saf.scope.navid) {
              if (bodyFile.data[this.saf.scope.navid]) {
                navUrl.pathname = path.join(
                  pathname,
                  bodyFilePath.dir,
                  path.parse(bodyFile.data[this.saf.scope.navid]).name
                )
              }
            }
          } catch (err) {
            throw new Error(`while loading the bodyFile '${ctextYAML.bodyFile}': ${err.message}`)
          }
        } else {
          // If the bodyFile property is not set, then use the ctext name to construct the navurl
          navUrl.pathname = path.join(pathname, this.saf.scope.navpath, path.parse(ctext).dir, path.parse(ctext).name)
          // if the body has a `navid` property, then use that to construct the navurl
          if (this.saf.scope.navid) {
            if (ctextFile.data[this.saf.scope.navid]) {
              navUrl.pathname = path.join(
                pathname,
                this.saf.scope.navpath,
                path.parse(ctext).dir,
                path.parse(ctextFile.data[this.saf.scope.navid]).name
              )
            }
          }
        }

        const formPhrases = resolveFormPhrases(ctextYAML.formPhrases)

        // Extract heading IDs from markdown content
        const headingIds = extractHeadingIds(body)

        // add properties to MRG Entry
        ctextYAML.scopetag = this.tuc.terminology.scopetag
        ctextYAML.locator = ctext
        ctextYAML.navurl = navUrl.href
        ctextYAML.formPhrases = formPhrases
        ctextYAML.headingids = headingIds

        if (ctextYAML.synonymOf) {
          TuCBuilder.synonymOf.push(ctextYAML)
        }
        TuCBuilder.cTextMap.push(ctextYAML)
      } catch (err) {
        log.error(`\tAn error occurred while attempting to load the curated text '${ctext}':`, err.message)
        continue
      }
    }
    return TuCBuilder.cTextMap
  }

  private addMrgEntry(instruction: string): void {
    // <key> <identifier><scopetag>:<vsntag>
    // examples: '* @tev2:v1', 'term[actor,party]@tev2:v1'
    const regex =
      /^(?<key>[^[@]+)?(?:\[(?<values>.+?)?\])?(?:(?<identifier>@)(?<scopetag>[a-z0-9_-]+?)?)?(?::(?<vsntag>.+)?)?$/
    const match = instruction.match(regex)
    Object.keys(match.groups).forEach((key) => {
      if (match.groups[key]) {
        match.groups[key] = match.groups[key].trim()
      }
    })

    if (!match) {
      log.error(`\tE021 Invalid instruction: '${instruction}'`)
      return undefined
    }

    const { key, values, identifier, scopetag, vsntag } = match.groups!
    let entries: MRG.Entry[]
    let source = ``
    valueUsed.clear()

    const valuelist = values?.split(",").map((v) => v.trim())
    if (key == null) {
      valuelist?.forEach((value, index) => {
        valuelist[index] = regularize(value)
      })
    }
    instruction = `${key ? key : ""}${key !== "*" ? "[" + valuelist?.join(", ") + "]" : ""}${
      identifier ? "@" + scopetag + (vsntag ? ":" + vsntag : "") : ""
    }`

    try {
      if (!identifier) {
        // add all terms for which there are curated texts in the current scope
        source = `curated texts`
        entries = this.getCtextEntries()
      } else {
        // add all terms in the MRG for either the current or the specified scope and version
        source = `mrg.${scopetag ?? this.saf.scope.scopetag}.${vsntag ? vsntag + "." : ""}yaml`

        const mrgMap = MRG.getInstance(this.saf.scope.localscopedir, this.saf.scope.glossarydir, source)
        entries = mrgMap.entries
      }

      if (key !== "*") {
        entries = entries.filter((entry) => entryFilter(entry, key, valuelist))
      }

      log.info(`\tTermselection (${source}): \t'${instruction}'`)

      const overwritten = []
      if (entries.length > 0) {
        // add entries to TuC and overwrite existing entries with the same termid
        for (const newEntry of entries) {
          if (!newEntry.termid) {
            newEntry.termid = `${newEntry.termType ?? this.saf.scope.defaulttype}:${newEntry.term}`
          }
          const existingIndex = this.tuc.entries.findIndex((entry) => entry.termid === newEntry.termid)
          if (existingIndex !== -1 && newEntry.termid != null) {
            // If an entry with the same termid already exists, replace it with the new entry
            this.tuc.entries[existingIndex] = { ...newEntry } // Create a shallow copy of the new entry
            overwritten.push(this.tuc.entries[existingIndex].termid)
          } else {
            // If no entry with the same term exists, add a shallow copy of the new entry to this.entries
            this.tuc.entries.push({ ...newEntry }) // Create a shallow copy of the new entry
          }
        }

        this.tuc.scopes.add({
          scopetag: scopetag,
          scopedir: ""
        })

        if (key !== "*") {
          log.trace(
            `\t\tAdded ${entries.length} entr${entries.length > 1 ? "ies" : "y"}: ${entries
              .map((entry) => entry.term)
              .join(", ")}`
          )

          //  Report valueList items that did not match any entries
          if (valuelist) {
            // compare the valueList with the list of values that were used in the selection
            const unmatchedValues = valuelist.filter((value) => !valueUsed.has(value))
            if (unmatchedValues.length > 0) {
              log.warn(
                `\t\tCould not match value${unmatchedValues.length > 1 ? "s" : ""}: ${
                  key ? key : ""
                }[${unmatchedValues.join(", ")}]`
              )
            }
          }
        } else {
          log.trace(`\t\tAdded ${entries.length} entr${entries.length > 1 ? "ies" : "y"} from ${source}`)
        }
        if (overwritten.length > 0) {
          log.warn(
            `\t\tOverwrote ${overwritten.length} entr${overwritten.length > 1 ? "ies" : "y"} with termid${
              overwritten.length > 1 ? "s" : ""
            }: ${overwritten.join(", ")}`
          )
        }
      } else {
        log.warn(`\t\tSelection matched 0 entries`)
      }
    } catch (err) {
      log.info(`\tTermselection (${source}): \t'${instruction}'`)
      log.error(`\t\tInstruction caused an error: ${err.message}`)
    }
  }

  private removeMrgEntry(instruction: string): void {
    // <key> <values>
    // example: '-term[actor,party]'
    const regex = /^(?<key>[^[]+)?(?:\[(?<values>.+?)?\])?$/
    const match = instruction.match(regex)
    Object.keys(match.groups).forEach((key) => {
      if (match.groups[key]) {
        match.groups[key] = match.groups[key].trim()
      }
    })

    if (!match) {
      log.error(`\tE021 Invalid instruction: '-${instruction}'`)
      return undefined
    }

    const { key, values } = match.groups!
    valueUsed.clear()

    const valuelist = values?.split(",").map((v) => v.trim())
    if (key == null) {
      valuelist?.forEach((value, index) => {
        valuelist[index] = regularize(value)
      })
    }
    instruction = `-${key ? key : ""}[${valuelist ? valuelist.join(", ") : ""}]`

    try {
      const removed = this.tuc.entries.filter((entry) => entryFilter(entry, key, valuelist))
      this.tuc.entries = this.tuc.entries.filter((entry) => !removed.includes(entry))

      log.info(`\tTermselection (provisional): \t'${instruction}'`)
      if (removed.length === 0) {
        // log warning if no entries were removed
        log.warn(`\t\tSelection matched 0 terms`)
      } else {
        log.trace(
          `\t\tRemoved ${removed.length} entr${removed.length > 1 ? "ies" : "y"}: ${removed
            .map((entry) => entry.term)
            .join(", ")}`
        )
        // report valueList items that did not match any entries
        if (valuelist) {
          // compare the valueList with the list of values that were used in the selection
          const unmatchedValues = valuelist.filter((value) => !valueUsed.has(value))
          if (unmatchedValues.length > 0) {
            log.warn(
              `\t\tCould not match value${unmatchedValues.length > 1 ? "s" : ""}: -${
                key ? key : ""
              }[${unmatchedValues.join(", ")}]`
            )
          }
        }
      }
    } catch (err) {
      log.info(`\tTermselection (provisional): \t'${instruction}'`)
      log.error(`\t\tInstruction caused an error: ${err.message}`)
    }
  }

  private renameMrgEntry(instruction: string): void {
    // <term><fieldmodifierlist>
    // example: 'rename party [ status:accepted, hoverText:"A natural person or a legal person" ]'
    const regex = /^(?<term>[^[]+)(?:\[(?<fieldmodifierlist>.+?)?\])?$/
    const match = instruction.match(regex)

    if (!match) {
      log.error(`\tE021 Invalid instruction: 'rename ${instruction}'`)
      return undefined
    }

    const fieldmodifierlist = match.groups!.fieldmodifierlist
    const term = match.groups!.term.trim()
    const fieldModifiers: Record<string, unknown> = {} // Initialize an object for field modifiers
    const modifierString: string[] = []

    try {
      if (fieldmodifierlist) {
        // Use a regular expression to capture the key-value pairs in the fieldmodifierlist
        const keyValueRegex = /[\s,]*([^:]+)\s*:\s*((["'`])(.*?)\3|[^,]+)\s*/g
        let keyValueMatch

        // Extract the key-value pairs from the field modifier list
        while ((keyValueMatch = keyValueRegex.exec(fieldmodifierlist))) {
          // remove leading and trailing whitespace
          const key = keyValueMatch[1]
          const value = keyValueMatch[4] ?? keyValueMatch[2]
          fieldModifiers[key] = value
          modifierString.push(`${key}: ${value}`)
        }
        instruction = `rename ${term} [${modifierString?.join(", ")}]`
      }

      // Find the entries with the term
      const entries = this.tuc.entries.filter((entry) => entryFilter(entry, "term", [term]))
      const renamed: string[] = []

      if (entries?.length > 0) {
        // Modify the entry based on the field modifiers
        for (const entry of entries) {
          renamed.push(entry.term)
          for (const [key, value] of Object.entries(fieldModifiers)) {
            entry[key] = value
          }
        }
      }

      log.info(`\tTermselection (provisional): \t'${instruction}'`)
      if (renamed.length === 0) {
        log.warn(`\t\tSelection matched 0 entries`)
      } else {
        log.trace(`\t\tRenamed ${renamed.length} entr${renamed.length > 1 ? "ies" : "y"}: ${renamed.join(", ")}`)
      }
    } catch (err) {
      log.info(`\tTermselection (provisional): \t'${instruction}'`)
      log.error(`\t\tInstruction caused an error: ${err.message}`)
    }
  }
}

/**
 * Checks if the given entry matches the given key and values.
 * @param entry - The entry to check.
 * @param key - The key to check.
 * @param values - The values to check.
 * @returns True if the entry matches the key and values, false otherwise.
 */
function entryFilter(entry: MRG.Entry, key: string, values: string[]): boolean {
  // if the entry has a field with the same name as the key
  if (entry[key] !== undefined) {
    // and both the values list and key entry property is empty
    if (!values && (entry[key] === "" || entry[key] === null)) {
      valueUsed.add(key)
      return true
    } else if (!values) {
      // if the values list is empty
      return false
    }
    // or the value of that field is in the value list
    for (const value of values) {
      if (typeof entry[key] === "string") {
        // if the entry[key] is a string
        if (entry[key] === value) {
          valueUsed.add(value)
          return true
        }
      } else {
        if ((entry[key] as string[])?.includes(value)) {
          // if the entry[key] is an array
          valueUsed.add(value)
          return true
        }
      }
    }
  } else if (key == null) {
    // consider the value list as a list of showtexts
    for (const value of values) {
      if (entry.term === value || entry.formPhrases?.includes(value)) {
        valueUsed.add(value)
        return true
      }
    }
  }
  return false
}

/**
 * Resolves the given form phrases by applying macro replacements.
 * @param formPhrases - The form phrases to resolve.
 * @returns An array of strings with all possible alternatives after macro replacements.
 */
function resolveFormPhrases(formPhrases: string[]): string[] {
  const alternatives = formPhrases != null ? formPhrases.map((t) => t.trim()) : []

  // create a new set of alternatives that includes all possible macro replacements
  const modifiedAlternatives = new Set<string>()

  for (const alternative of alternatives) {
    const generatedAlternatives = applyMacroReplacements(alternative, mappings.formphrase_macro_map)
    for (const generatedAlternative of generatedAlternatives) {
      modifiedAlternatives.add(regularize(generatedAlternative))
    }
  }

  return Array.from(modifiedAlternatives)
}

/**
 * Applies the macro replacements to the given input.
 * @param input - The input to apply the macro replacements to.
 * @param regexMap - The map of macro replacements.
 * @returns An array of strings with all possible alternatives after macro replacements.
 */
function applyMacroReplacements(input: string, regexMap: Record<string, string[]>): string[] {
  // check if the input contains a macro
  const match = input.match(/\{(\w+)}/)

  // if no macro is found, return the input as is
  if (match == null) {
    return [input]
  }

  const macroKey = match[1]
  const replacements = regexMap[`{${macroKey}}`] ?? []

  // split the input into prefix and suffix at the macro
  const prefix = input.substring(0, match.index)
  const suffix = input.substring(match.index != null ? match.index + match[0].length : match[0].length)

  const result: string[] = []

  // recursively apply macro replacements and use recursion to handle multiple macros
  for (const replacement of replacements) {
    const newAlternative = prefix + replacement + suffix
    result.push(...applyMacroReplacements(newAlternative, regexMap))
  }

  return result
}

/**
 * Extracts the heading IDs from the markdown content.
 * @param content The markdown content.
 * @returns An array of heading IDs.
 */
function extractHeadingIds(content: string): string[] {
  // Regular expression to match markdown headings
  const headingRegex =
    /^#{1,6}\s+(?:[^{\n]+)(?:{.*#{1,6}\s?(?<md_id>[^}]+)})$|^#{1,6}\s+(?<md>[^{\n]+)$|(?:<(?:h[1-6])(?:.+id="(?<html_id>[^"\\]+)")?.*>(?<html>.*?)<\/h[1-6]>)/gm
  // Named capturing groups:
  //   md (# heading)
  //   md_id (# heading {#heading})
  //   html (h1>heading</h1>)
  //   html_id (<h1 id="heading">heading</h1>)
  const headingIds: string[] = []

  for (const match of content.matchAll(headingRegex)) {
    const headingId = match.filter(Boolean)[1].trim().replace(/\s+/g, "-").toLowerCase()
    headingIds.push(headingId)
  }

  return headingIds
}
