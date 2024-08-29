# TEv2-Tools | TNO Terminology Design

The Terminology Engine (v2) is a set of specifications and tools that caters for the creation and maintenance (i.e. curation) of terminologies. This repository contains the sources for the tools.

Please refer to the [project documentation](https://tno-terminology-design.github.io/tev2-specifications) for more information.

## Release Notes

### v1.2.1

- Rename `-o` into `-e` as equivalent for `--onNotExist`, to avoid ambiguities with `-o` that is used for output stuff (HRGT, MRG-import)
- Make calling MRGT, HRGT more robust in terms of testing that stuff exists, and enhancing the logging
- MRGT has some bugfixing in the treatment of `synonymOf` fields.
- HRGT command line no longer has `converter` as a requirement - if it isn't specified on the command-line, the config file, or in the MRG-ref, a default is taken.

### v1.2.0

- Starting from release 1.2.0, we are maintaining more detailed release notes
- MRGT has a bug fixed in handling `synonymOf` fields.

