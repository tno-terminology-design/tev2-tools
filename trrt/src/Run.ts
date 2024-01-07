#!/usr/bin/env node

import { Interpreter } from "./Interpreter.js"
import { Converter } from "./Converter.js"
import { Resolver } from "./Resolver.js"
import { SAF } from "@tno-terminology-design/utils"
import { report, log } from "@tno-terminology-design/utils"
import { Command, type OptionValues } from "commander"
import { readFileSync } from "fs"
import { resolve } from "path"

import yaml from "js-yaml"
import chalk from "chalk"
import figlet from "figlet"

const program = new Command()
const name = "trrt"
const version = "1.0.14"

program
  .name(name)
  .usage(
    "[ <paramlist> ] [ <globpattern> ]\n" +
      "- <paramlist> (optional) is a list of key-value pairs\n" +
      "- <globpattern> (optional) specifies a set of (input) files that are to be processed\n" +
      "\n" +
      "*Multiple converters may be specified by appending a number to the option, e.g., `--converter[1] <template> --converter[2] <template>`, where `n` is the termid occurrence count from which to start using a specific converter during resolution of a file. Using `--converter`, without a number, is equal to using `--converter[0]`\n"
  )
  .description("The CLI for the Term Reference Resolution Tool")
  .version(version, "-V, --version", "Output the version number")
  .option("-c, --config <path>", "Path (including the filename) of the tool's (YAML) configuration file")
  .option("-o, --output <dir>", "(Root) directory for output files to be written")
  .option("-s, --scopedir <path>", "Path of the scope directory where the SAF is located")
  // If interpreters or converters are added/removed, please adjust the documentation in the repo-file `tno-terminology-design/tev2-specifications/docs/spec-files/90-configuration-file.md`.
  .option(
    "--int, --interpreter <regex> or <predeftype>",
    "Type of interpreter, i.e., a regex, or a predefined type (`default`, `alt`)"
  ) // `basic` is deprecated
  .option(
    "--con[n], --converter[n] <template> or <predeftype>*",
    "Type of converter, i.e., a mustache/handlebars template, or a predefined type (`markdown-link`, `html-link`, `html-hovertext-link`, `html-glossarytext-link`)"
  )
  .option("-f, --force", "Allow overwriting of existing files")
  .option("-h, --help", "Display help for command")
  .allowUnknownOption(true)
  .parse(process.argv)

async function main(): Promise<void> {
  let options = program.opts()

  console.log(chalk.red(figlet.textSync(name + "-cli", { horizontalLayout: "full" })))
  console.log(`Version: ${version}\n`)

  // Process command line converter options
  for (const [key, value] of Object.entries(process.argv.slice(2))) {
    const match = value.match(/^--con(?:verter)?(?:\[(?<n>\d+)?\])?$/)
    if (match) {
      const template = process.argv[parseInt(key) + 3]
      const i = program.args.indexOf(value)
      if (match.groups.n == null || parseInt(match.groups.n) < 1) {
        options.converter = template
      } else {
        options[`converter[${match.groups.n}]`] = template
      }
      if (i !== -1) {
        program.args.splice(i, 2)
      }
    }
  }

  // Use the remaining arguments as input
  if (program.args[0]) {
    options.input = program.args
  }

  if (options.config) {
    try {
      const config = yaml.load(readFileSync(resolve(options.config), "utf8")) as OptionValues

      // Overwrite command line options with config options and trrt specific config options
      const { trrt, ...rest } = config
      options = { ...rest, ...trrt, ...options }
    } catch (err) {
      throw new Error(`E011 Failed to read or parse the config file '${options.config}':`, { cause: err })
    }
  }

  // Process converter options and populate the map
  const converterMap = new Map<number, Converter>()
  for (const [key, value] of Object.entries(options)) {
    const match = key.match(/^converter(?:\[(?<n>\d+)\])?$/)
    if (match) {
      const template = value as string
      const converter = new Converter({ template })
      converterMap.set(parseInt(match.groups?.n) || 0, converter)
    }
  }

  // Check if required options are provided
  if (options.output == null || options.scopedir == null || options.input == null) {
    program.addHelpText(
      "after",
      "\nRequired options are missing\n" +
        "Provide at least the following options: output <path>, scopedir <path>, input <globpattern>\n"
    )
    program.help()
    process.exit(1)
  }

  // Create an interpreter, converter, and saf with the provided options
  const interpreter = new Interpreter({ regex: options.interpreter ?? "default" })
  const saf = new SAF.Builder({ scopedir: resolve(options.scopedir) }).saf

  // Create a resolver instance
  const resolver = new Resolver({
    outputPath: resolve(options.output),
    globPattern: options.input,
    force: options.force,
    converterMap,
    interpreter,
    saf
  })

  // Resolve terms
  await resolver.resolve()
  log.info("Resolution complete...")
  report.print()
}

try {
  await main()
  process.exit(0)
} catch (err) {
  if ((err as Error).cause != null) {
    log.error(err)
  } else {
    log.error("E012 Something unexpected went wrong while resoluting terms:", err)
  }
  process.exit(1)
}
