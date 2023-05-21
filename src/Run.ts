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
      const options = program.opts();
      if (!options.output || !options.saf) {
            program.outputHelp();
      } else {
            // a term is found with a scopetag that has not yet been resolved.
            // 
            //       look up the scopedir from the scopes section of the main saf
            //       from the resulting scopedir, read the saf 

            // get the MRG associated with the vsntag of the term ref.
            //       search the versions section that matches vsntag or altvsntags and obtain the mrgfile.
            
            // add the entire newly found MRG to the working glossary term@scopetag:vsntag.
            //       match term to term
            //       match possible termtype to termtype
            //       

            let resolver: Resolver = new Resolver({ outputPath: options.output, safPath: options.saf, configPath: options.config, inputPath: options.directory, defaultVersion: options.defaultversion, interpreterType: options.interpreter, converterType: options.converter, recursive: options.recursive });
            if (await resolver.resolve()) {
                  log.info("Resolution complete...");
            } else {
                  log.error("Failed to resolve terms, see logs...");
            }
      }
}

main();
