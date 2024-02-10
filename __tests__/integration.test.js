import { spawn } from "child_process"
import { glob } from "glob"
import { expect } from "chai"

import path from "path"
import fs from "fs"
import yaml from "js-yaml"

const __testdir = path.dirname(new URL(import.meta.url).pathname)
const __rootdir = process.env.PWD

const scopedir = path.resolve(__testdir, "content")
const outputdir = path.resolve(__testdir, "output")

const configFile = path.join(scopedir, "terminology-config.yaml")
const config = yaml.load(fs.readFileSync(configFile, "utf8"))

const saf = yaml.load(fs.readFileSync(path.join(scopedir, "saf.yaml"), "utf8"))
const glossarydir = path.join(scopedir, saf.scope.glossarydir)

const runTool = async (tool) => {
  const toolPath = path.resolve(__rootdir, tool + "/lib/Run.js")
  let consoleOutput = ""

  return new Promise((resolve) => {
    const process = spawn("node", [toolPath, "-c", configFile])

    process.stdout.on("data", (data) => {
      consoleOutput += data.toString()
    })

    process.stderr.on("data", (data) => {
      console.error(data.toString())
    })

    process.on("close", (run) => {
      console.log(consoleOutput)
      expect(run).to.equal(0)
      resolve(consoleOutput)
    })
  })
}

describe("Running MRG-Importer on provided test files", () => {
  before(async () => {
    await runTool("mrg-import")
  })

  const scopetags = saf.scopes.map((scope) => scope.scopetag)
  for (const scope of scopetags) {
    it(`should verify the existence of the external scope '${scope}'`, async () => {
      const scopeFiles = await glob(path.join(glossarydir, `mrg.${scope}*.yaml`))

      expect(scopeFiles.length).to.be.greaterThan(0)

      for (const file of scopeFiles) {
        const content = fs.readFileSync(file, "utf8")
        const mrgFile = path.parse(file).base
        const mrg = yaml.load(content)

        expect(mrg).to.be.an("object", `MRG file (${mrgFile}) should be a valid YAML object`)
        expect(mrg.entries).to.be.an("array", `MRG entries in '${mrgFile}' should be an array`)
        expect(mrg.entries).to.have.length.greaterThan(0, `MRG in '${mrgFile}' should have at least one entry`)
      }
    })
  }
})

describe("Running MRGT on provided test files", () => {
  before(async () => {
    await runTool("mrgt")
  })

  const vsntags = saf.versions.map((version) => version.vsntag)
  for (const version of vsntags) {
    const mrgFile = `mrg.${saf.scope.scopetag}.${version}.yaml`
    const mrgFilePath = path.join(glossarydir, mrgFile)

    it(`should generate MRG '${mrgFile}'`, async () => {
      const mrg = yaml.load(fs.readFileSync(mrgFilePath))

      expect(mrg).to.be.an("object", `MRG file (${mrgFile}) should be a valid YAML object`)
      expect(mrg.entries).to.be.an("array", `MRG entries in '${mrgFile}' should be an array`)
      expect(mrg.entries).to.have.length.greaterThan(0, `MRG in '${mrgFile}' should have at least one entry`)

      // additional tests for MRG entries
      mrg.entries.forEach((entry) => {
        expect(entry.termid).to.be.a("string").with.length.greaterThan(0)
        expect(entry.navurl).to.be.a("string").with.length.greaterThan(0)
      })
    })
  }
})

describe("Running HRGT and TRRT on provided test files", () => {
  before(async () => {
    await runTool("hrgt")
    await runTool("trrt")
  })

  it("should output a file identical to 'result.md'", async () => {
    const resultFile = path.join(scopedir, "result.md")
    const outputFiles = await glob(path.join(outputdir, config.hrgt.input[0]))
    const outputFile = outputFiles[0]

    expect(fs.existsSync(outputFile)).to.be.true

    const result = fs.readFileSync(resultFile, "utf8")
    const output = fs.readFileSync(outputFile, "utf8")

    expect(output).to.equal(result)
  })
})
