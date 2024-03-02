import fs = require("fs")
import path = require("path")
import yaml = require("js-yaml")

import { formphrase_macro_map } from "../mappings.js"

export interface Type {
  scope: Scope
  scopes: Scopes[]
  versions: Version[]
}

export interface Scope {
  scopetag: string
  scopedir: string
  curatedir: string
  glossarydir: string
  defaultvsn: string
  defaulttype: string
  website: string
  navpath: string
  navid?: string
  license?: string
  statuses?: string[]
  macros?: Record<string, string[]>
  localscopedir: string
}

export interface Scopes {
  scopetag: string
  scopedir: string
}

export interface Version {
  vsntag: string
  altvsntags: string[]
  termselection: string[]
}

/**
 * The SafBuilder class handles the retrieval and processing of a SAF (Scope Administration File).
 * A SAF is retrieved based on the `scopedir` and processed into a SAF object.
 */
export class Builder {
  saf: Type

  public constructor({ scopedir }: { scopedir: string }) {
    this.saf = this.setMap(path.join(scopedir, "saf.yaml"))

    this.saf.scope.localscopedir = scopedir
  }

  /**
   * Reads the SAF at `safURL` and maps it as the this.saf SAF object.
   * @param safURL - The full path of the SAF to be retrieved.
   * @returns - The SAF as a SAF object.
   */
  private setMap(safURL: string): Type {
    try {
      // try to load the SAF map from the scopedir
      this.saf = yaml.load(fs.readFileSync(safURL, "utf8")) as Type

      // check for missing required properties in SAF
      type ScopeProperty = keyof Scope
      const requiredProperties: ScopeProperty[] = ["scopetag", "scopedir", "curatedir", "defaultvsn"]
      const missingProperties = requiredProperties.filter((prop) => this.saf.scope[prop] == null)

      if (missingProperties.length > 0) {
        throw new Error(`Missing required property: '${missingProperties.join("', '")}'`)
      }

      // Set default values for optional properties in SAF
      if (this.saf.scope.website == undefined) {
        this.saf.scope.website = "/"
      }
      if (this.saf.scope.navpath == undefined) {
        this.saf.scope.navpath = "/"
      }
      if (this.saf.scope.defaulttype == undefined) {
        this.saf.scope.defaulttype = "concept"
      }

      // Check if there are existing versions
      if (!this.saf.versions || this.saf.versions.length === 0) {
        throw new Error(`No versions found`)
      }

      // Add the formphrase macros to the formphrase_macro_map
      if (this.saf.scope.macros) {
        for (const [key, value] of Object.entries(this.saf.scope.macros)) {
          // handle the case where the values are passed as a list
          if (!Array.isArray(value)) {
            for (const [key, list] of Object.entries(value)) {
              formphrase_macro_map[key] = list as string[]
            }
          } else {
            formphrase_macro_map[key] = value
          }
        }
      }
    } catch (err) {
      throw new Error(`E004 An error occurred while attempting to load the SAF at '${safURL}':`, { cause: err })
    }

    return this.saf
  }
}
