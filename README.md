# Machine Readable Glossary Import Tool

## Overview

The **MRG Import Tool** ensures that the scope within which it is run, obtains a local copy of all MRGs that are available in the scopes that are mentioned in the [scopes section](https://tno-terminology-design.github.io/tev2-specifications/docs/tev2/spec-files/saf#scopes) of its SAF. This makes life easy for various tools, e.g., the MRGT and the TRRT, that can now assume that all MRGs that they may need to consult in order to do their job, are readily available. There is more information about 
- the [MRG Import Tool documentation](https://tno-terminology-design.github.io/mrg-import/),
- [overview of the TEv2 tools](https://tno-terminology-design.github.io/tev2-specifications/docs/tev2/tev2-overview) of which the MRG Import Tool is a part.

## Installation

Install from the command line and make globally available.

```bash
npm install @tno-terminology-design/mrg-import -g
```

## Calling the Tool

~~~bash
mrg-import [ <paramlist> ]
~~~

where:
- `<paramlist>` (optional) is a list of key-value pairs

## Parameters and Options

| Flags                      | Description | Req'd |
| :------------------------- | :---------- | :---: |
| -c, --config \<path>       | Path (including the filename) of the tool's (YAML) [configuration file](#configuration-file) as an absolute or relative path from where the tool is called. This file contains the key-value pairs to be used. Allowed keys (and the associated values) are documented in this table. Command-line arguments override key-value pairs specified in the [configuration file](#configuration-file). This parameter MUST NOT appear in the [configuration file](#configuration-file) itself. |   n   |
| -s, --scopedir \<path>     | Path of the [scope directory](@) from which the tool is called. It MUST contain the [SAF](@) for that [scope](@), which we will refer to as the 'own scope' for the [MRG Import Tool](@). |   Y   |
| -o, --onNotExist \<action> | Specifies the action (i.e., throw, warn, log or ignore) to take in case a [MRG](@) file that was expected to exist, does not exist. Default is `throw`. |  n   |
| -V, --version              | Output the version number of the tool. |   n   |
| -h, --help                 | Display usage and options help text. |   n   |

Please refer to the [TRRT documentation](https://tno-terminology-design.github.io/mrg-import/) for more information.
