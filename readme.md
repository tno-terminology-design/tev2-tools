# Term Reference Resolution Tool (TRRT)

## Overview

The Term Ref(erence) Resolution Tool (TRRT) takes markdown files that contain so-called term refs (e.g. `[terms communities](terms-community@ctwg)`) and creates a copy for each of these files in which all term refs are converted to so-called renderable refs, i.e. texts that can be further processed by tools such as Github pages, Docusaurus (plugins), etc., the result of which is that the rendered document contains markups that help readers to quickly find more explanations of the concept or other knowledge artifact that is being referenced. More informations at: [Term Reference Resolution](https://essif-lab.github.io/framework/docs/tev2/spec-tools/trrt).

### Who will use the TRRT

The TRRT will be used by terminology creators and curators to generate an rednerable refs. It can also be used in a CD/CI pipe to automatically generate an GitHub Pages as part of a GitHub action or similar.

### What inputs does the TRRT need

For resolution to work, the following artefacts need to be present:

* The Scope Administration File (SAF);
* Access to (already existing) [MRGs](https://essif-lab.github.io/framework/docs/tev2/spec-tools/mrgt) insofar as they contain terms that are to be referenced in the refs that the tool creates;
* The curated texts that document the terms (or other artifacts) that are to be resolved by the TRRT.

## Local Deployment

Install dependencies
`npm install`

Build .js files from .ts files:
`npm run build`

Make TRRT globally available:
`npm install -g .`

## Calling the Tool

The behavior of the TRRT can be configured per call e.g. by a configuration file and/or command-line parameters. The command-line syntax is as follows:

`trrt [ <paramlist> ] [ <globpattern> ]`

The TRRT takes in the following parameters:

|         Flags        |                      Description                             | Required |
|:--------------------:|:------------------------------------------------------------:|:--------:|
|     -o, --output     |           Path to output converted files to                  |    Yes   |
|      -s, --saf       |               Path to read SAF file from                     |    Yes   |
|     -c, --config     |            Path to configuration .yaml file                  |    No    |
|    -d, --directory   |    Path to directory where input files are located           |    No    |
| -V, --defaultversion | Default version to use when no version is set in term        |    No    |
|   -I, --interpreter  |       Set interpreter to 'Standard' or 'Alt' syntax          |    No    |
|    -C, --converter   |     Set converter to 'Markdown', 'HTTP' or 'ESIFF' output    |    No    |

See [documentation](https://essif-lab.github.io/framework/docs/tev2/spec-tools/trrt) for YAML file formatting guides. You can run the test demonstration with the command:

`trrt -o docs/tev2/tests_converted -s docs/tev2/saf.yaml -d docs/tev2/tests`
