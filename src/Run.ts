#!/usr/bin/env node

import { Resolver } from './Resolver.js'
import { Logger } from 'tslog';
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import { Command } from 'commander';
const program = new Command();

clear();

console.log(
      chalk.red(
            figlet.textSync('trrt-cli', { horizontalLayout: 'full' })
      )
);

program
      .name('trrt')
      .version('0.0.3')
      .description("A CLI for the Term Reference Resolution Toolkit")
      .option('-o, --output <path>', 'Path to output converted files to (required)')
      .option('-s, --saf <path>', 'Path to read SAF file from (required)')
      .option('-c, --config <path>', 'Path to configuration .yaml file')
      .option('-d, --directory <path>', 'Path to directory where input files are located')
      .option('-V, --defaultversion <vsn>', 'Default version to use when no version is set in term')
      .option('-I, --interpreter <type>', 'Set interpreter to Standard or Alt syntax')
      .option('-C, --converter <type>', 'Set converter to Markdown HTTP or ESIFF output')
      .option('-r, --recursive', 'Recursively read contents and output subdirectories of the input')
      .parse(process.argv);

program.parse()

async function main(): Promise<void> {
      const log = new Logger();

      // Parse command line options
      const options = program.opts();

      // Check if required options are provided
      if (!options.output || !options.saf) {
            program.outputHelp();
      } else {
            // Create a resolver with the provided options
            let resolver: Resolver = new Resolver({
                  outputPath: options.output,
                  safPath: options.saf,
                  configPath: options.config,
                  inputPath: options.directory,
                  defaultVersion: options.defaultversion,
                  interpreterType: options.interpreter,
                  converterType: options.converter,
                  recursive: options.recursive
            });
            
            // Resolve terms
            if (await resolver.resolve()) {
                  log.info("Resolution complete...");
            } else {
                  log.error("Failed to resolve terms, see logs...");
            }
      }
}

main();
