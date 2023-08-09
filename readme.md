# Term Reference Resolution Tool (TRRT)

## Overview

The **Term Ref(erence) Resolution Tool (TRRT)** takes files that contain so-called [term refs](https://tno-terminology-design.github.io/tev2-specifications/docs/tev2/terms/term-ref) and outputs a copy of these files in which these term refs are converted into so-called [renderable refs](https://tno-terminology-design.github.io/tev2-specifications/docs/tev2/terms/renderable-ref), i.e. texts that can be further processed by tools such as GitHub pages, Docusaurus, etc. The result of this is that the rendered document contains markups that help readers to quickly find more explanations of the concept or other knowledge artifact that is being referenced. There is more information about 
- the [TRRT documentation](https://tno-terminology-design.github.io/trrt/),
- [overview of the TEv2 tools](https://tno-terminology-design.github.io/tev2-specifications/docs/tev2/tev2-overview) of which the TRRT is a part.

## Installation

Install from the command line and make globally available.

'''bash
npm install @tno-terminology-design/trrt -g
'''

## Calling the Tool

The behavior of the TRRT can be configured per call e.g. by a configuration file and/or command-line parameters. The command-line syntax is as follows:

'''bash
trrt [ <paramlist> ] [ <globpattern> ]
```

The TRRT takes in the following parameters:

|Flags                         |Description                                                             |Required|
|------------------------------|------------------------------------------------------------------------|:------:|
|-c, --config \<path>          |Path (including the filename) of the tool's (YAML) configuration file   |No      |
|input \<globpattern>          |Glob pattern that specifies the set of (input) files                    |No      |
|-o, --output \<dir>           |(Root) directory for output files to be written                         |Yes     |
|-s, --scopedir \<path>        |Path of the scope directory where the SAF is located                    |Yes     |
|-v, --vsntag \<vsntag>        |Default version to use when no version is set in term ref               |No      |
|-int, --interpreter \<type>   |Set interpreter to Alt syntax                                           |No      |
|-con, --converter \<type>     |Set converter to Markdown HTTP or ESIFF output                          |No      |
|-f, --force                   |Allow overwriting of existing files                                     |No      |

Please refer to the [TRRT documentation](https://tno-terminology-design.github.io/trrt/) for more information.
