#!/usr/bin/env node

import { Interpreter } from './Interpreter.js';
import { Converter } from './Converter.js';
import { Glossary } from './Glossary.js';
import { Resolver } from './Resolver.js'
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { report, log } from './Report.js';

import yaml from 'js-yaml';
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';

export let interpreter: Interpreter;
export let converter: Converter;
export let glossary: Glossary;
export let resolver: Resolver;
const program = new Command();

clear();

console.log(
      chalk.red(
            figlet.textSync('trrt-cli', { horizontalLayout: 'full' })
      )
);

program
      .name('trrt')
      .version('1.0.0')
      .usage('[ <paramlist> ] [ <globpattern> ]\n' +
      '- <paramlist> (optional) is a list of key-value pairs\n' +
      '- <globpattern> (optional) specifies a set of (input) files that are to be processed')
      .description("The CLI for the Term Reference Resolution Tool")
      .option('-c, --config <path>', 'Path (including the filename) of the tool\'s (YAML) configuration file')
      .option('-o, --output <dir>', '(Root) directory for output files to be written')
      .option('-s, --scopedir <path>', 'Path of the scope directory where the SAF is located')
      .option('-int, --interpreter <type> or <regex>', 'Type of interpreter, either: a regex, alt, or basic')
      .option('-con, --converter <type> or <mustache>', 'Type of converter, either: a mustache template, http, or markdown')
      .parse(process.argv);

program.parse()

async function main(): Promise<void> {
      // Parse command line parameters
      var options = program.opts();
      if (program.args[0]) {
            options.input = program.args[0]
      }

      if (options.config) {
            try {
                  const config = yaml.load(readFileSync(resolve(options.config), 'utf8')) as yaml.Schema;

                  // Merge config options with command line options
                  options = { ...config, ...options };
            } catch (err) {
                  log.error('Failed to read or parse the config file:', err);
                  process.exit(1);
            }
      }

      // Check if required options are provided
      if (!options.output || !options.scopedir) {
            program.addHelpText('after', '\nRequired options are missing\n' +
            'Provide at least the following options: --output <path>, --scopedir <path>');
            program.help();
            process.exit(1);
      
      } else {
            // Create an interpreter, converter and glossary with the provided options
            converter = new Converter({ template: options.converter ?? "markdown"});
            interpreter = new Interpreter({ regex: options.interpreter ?? "basic"});
            glossary = new Glossary({ scopedir: resolve(options.scopedir) });

            // Create a resolver with the provided options
            resolver = new Resolver({
                  outputPath: resolve(options.output),
                  globPattern: options.input
            });
            
            // Resolve terms
            try {
                  await resolver.resolve()
                  log.info("Resolution complete...");
                  report.print();
                  process.exit(0);
            } catch (err) {
                  log.error("Something unexpected went wrong while resoluting terms:", err);
                  process.exit(1);
            }
      }
}

main();
