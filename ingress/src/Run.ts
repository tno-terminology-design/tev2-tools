#!/usr/bin/env node

import * as fs from "fs"
import * as yaml from "js-yaml"
import { simpleGit } from "simple-git"
import { Command } from "commander"
import { CuratedTextParser } from "./CuratedText.js"
import { fileURLToPath } from "url"
import { filenameToTitle, filenameToTerm, getFileContents, saveToFile, scanDir } from "./utils.js"
import path from "path"
import chalk from "chalk"
import figlet from "figlet"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"))
const version = packageJson.version
const program = new Command()

program
  .name("tev2-ingress")
  .version(version)
  .usage(
    "[ <paramlist> ] [ <globpattern> ]\n" +
      "- <paramlist> (optional) is a list of key-value pairs\n" +
      "- <globpattern> (optional) specifies a set of (input) files that are to be processed"
  )
  .description("The CLI for the Term Reference Resolution Tool")
  .option("-c, --config <path>", "Path (including the filename) of the tool's (YAML) configuration file")
  .option("-w, --wikiPath <path>", "Path of the local filesystem for the wiki folder to be created")
  .option("-r, --githubRepo <path>", "Path of the github repo the wiki lives in")
  .option("-o, --output <dir>", "(Root) directory for output files to be written")
  .option("-s, --scopedir <path>", "Path of the scope directory where the SAF is located")
  .option("-t, --termselcriteria", "List of term selection criteria that are used to generate")
  .option("-m, --method", "The method that is used to create the output (default HTML)")
  .option("-l, --license", "File that contains the licensing conditions")
  .option("-f, --force", "Allow overwriting of existing files")
  .parse(process.argv)

program.parse()

const main = async (): Promise<void> => {
  let options = program.opts()
  if (program.args[0]) {
    options.input = program.args[0]
  }

  console.log(chalk.red(figlet.textSync("TEv2 Ingress", { horizontalLayout: "full" })))
  console.log(chalk.yellow(figlet.textSync(version, { horizontalLayout: "full" })))

  if (options.config) {
    try {
      const config = yaml.load(fs.readFileSync(path.resolve(options.config), "utf8")) as yaml.Schema

      // Merge config options with command line options
      options = { ...config, ...options }
    } catch (err) {
      console.error(`E011 Failed to read or parse the config file '${options.config}':`, err)
      process.exit(1)
    }
  }

  // Validate the settings object
  if (!options.githubRepo)
    throw new Error(
      "Github Repo is required. Please provide a URL to a repo using with the -r or --githubRepo flag or githubRepo in the config.yaml file."
    )
  console.log(`Processing Repo wiki: ${options.githubRepo}`)

  console.log(JSON.stringify(options, null, 2)) // TODO might need to remove this. If there are any secrets it would leak them.

  // Delete the cloned wiki repo directory if it alredy exists
  fs.rmSync(options.wikiPath ?? "./wiki", { recursive: true, force: true })

  // Clone the Github wiki repo
  await simpleGit().clone(options.githubRepo, options.wikiPath ?? "./wiki", undefined, (err) => {
    if (err) {
      console.log(`Error cloning repo: ${err.name} ${err.message}`)
      process.exit(1)
    }
  })

  // Scan the cloned wiki repo for markdown files
  const files = scanDir(options.wikiPath ?? "./wiki")
  if (!fs.existsSync("curated-texts")) {
    fs.mkdirSync("curated-texts", { recursive: true })
  }
  files.forEach((file) => {
    const newFile = file.replace("wiki", "curated-texts")
    const curatedText = new CuratedTextParser(getFileContents(file), {
      glossaryTerm: filenameToTitle(file),
      term: filenameToTerm(file),
      termType: "concept"
    })
    curatedText.toYAML()
    console.log(file, "->", newFile)
    saveToFile(newFile, curatedText.toYAML())
  })

  // Delete the cloned wiki repo directory
  fs.rmSync(options.wikiPath ?? "./wiki", { recursive: true, force: true })
}

main()
