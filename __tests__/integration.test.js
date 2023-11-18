import { spawn } from "child_process"
import path from "path"
import fs from "fs"
import { glob } from "glob"
import { expect } from "chai"
import { readFileSync } from "fs"

import yaml from "js-yaml"

const __testdir = path.dirname(new URL(import.meta.url).pathname)
const __rootdir = process.env.PWD

describe("Run TRRT on provided test files", () => {
  it("should verify term conversion count of test files", (done) => {
    const trrtPath = path.resolve(__rootdir, "trrt/lib/Run.js")
    const contentPath = path.resolve(__testdir, "content")
    const configFile = path.resolve(contentPath, "terminology-config.yaml")

    const trrtProcess = spawn("node", [trrtPath, "-c", configFile])
    let consoleOutput = ""

    trrtProcess.stdout.on("data", (data) => {
      consoleOutput += data.toString()
    })

    trrtProcess.stderr.on("data", (data) => {
      console.error(data.toString())
    })

    trrtProcess.on("close", async (code) => {
      console.log(consoleOutput)
      expect(code).to.equal(0)

      const termRegex =
        /(?:(?<=[^`\\])|^)\[(?=[^@\]]+\]\([#a-z0-9_-]*@[:a-z0-9_-]*\))(?<showtext>[^\n\]@]+)\]\((?:(?<id>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]+))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+))?\)/g

      const config = yaml.load(readFileSync(configFile, "utf8"))

      const inputFile = await glob(config.trrt.input[0])

      fs.readFile(inputFile[0], "utf8", (_err, fileContent) => {
        const termMatches = fileContent.match(termRegex)
        const termCount = termMatches ? termMatches.length : 0
        expect(consoleOutput).to.contain(`Number of terms converted: ${termCount}`)

        fs.readFile(outputFile, "utf8", (_err, fileContent) => {
          expect(fileContent).to.contain(`<a href="`)
          done()
        })
      })
    })
  })
})
