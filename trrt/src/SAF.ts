import fs = require("fs")
import path = require("path")
import yaml = require("js-yaml")

export interface SAF {
  scope: Scope
  scopes: Scopes[]
  versions: Version[]
}

interface Scope {
  website: string
  scopetag: string
  scopedir: string
  curatedir: string
  glossarydir: string
  defaultvsn: string
  mrgfile: string
}

interface Scopes {
  scopetags: string[]
  scopedir: string
}

interface Version {
  vsntag: string
  mrgfile: string
  altvsntags: string[]
}

/**
 * The SafBuilder class handles the retrieval and processing of a SAF (Scope Administration File).
 * A SAF is retrieved based on the `scopedir` and processed into a SAF object.
 */
export class SafBuilder {
  saf: SAF

  public constructor({ scopedir }: { scopedir: string }) {
    this.saf = this.setSafMap(path.join(scopedir, "saf.yaml"))

    this.saf.scope.scopedir = scopedir // override scopedir with the one passed as a parameter
  }

  /**
   * Reads the SAF at `safURL` and maps it as the this.saf SAF object.
   * @param safURL - The full path of the SAF to be retrieved.
   * @returns - The SAF as a SAF object.
   */
  private setSafMap(safURL: string): SAF {
    try {
      // try to load the SAF map from the scopedir
      this.saf = yaml.load(fs.readFileSync(safURL, "utf8")) as SAF

      // check for missing required properties in SAF
      type ScopeProperty = keyof Scope
      const requiredProperties: ScopeProperty[] = ["scopetag", "scopedir", "curatedir", "defaultvsn"]
      const missingProperties = requiredProperties.filter((prop) => this.saf.scope[prop] == null)

      if (missingProperties.length > 0) {
        throw new Error(`Missing required property in SAF at '${safURL}': '${missingProperties.join("', '")}'`)
      }
    } catch (err) {
      throw new Error(`E004 An error occurred while attempting to load the SAF at '${safURL}':`, { cause: err })
    }

    return this.saf
  }
}
