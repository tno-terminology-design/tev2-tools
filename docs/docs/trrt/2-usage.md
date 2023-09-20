# Usage

The behavior of the [TRRT](@) can be configured per call e.g. by a [configuration file](#configuration-file) and/or command-line parameters. The command-line syntax is as follows:

~~~bash
trrt [ <paramlist> ] [ <globpattern> ]
~~~

where:
- `<paramlist>` (optional) is a list of key-value pairs
- [`globpattern`](https://en.wikipedia.org/wiki/Glob_(programming)#Syntax) (optional) specifies a set of (input) files that are to be processed. If a [configuration file](#configuration-file) is used, its contents may specify an additional set of input files to be processed.

## Parameters and options

<details>
  <summary>Legend</summary>

The columns in the following table are defined as follows:
1. **`Key`** is the text to be used as a key.
2. **`Value`** represents the kind of value to be used.
3. **`Req'd`** specifies whether (`Y`) or not (`n`) the field is required to be present when the tool is being called. If required, it MUST either be present in the configuration file, or as a command-line parameter.
4. **`Description`** specifies the meaning of the `Value` field, and other things you may need to know, e.g. why it is needed, a required syntax, etc.

</details>

| Key                        | Value                      | Req'd | Description |
| :------------------------- | :------------------------- | :---: | :---------- |
| `-c`<br/>`--config`        | `<path>`                   |   n   | Path (including the filename) of the tool's (YAML) configuration file as an absolute or relative path from where the tool is called. This file contains the key-value pairs to be used. Allowed keys (and the associated values) are documented in this table. Command-line arguments override key-value pairs specified in the configuration file. This parameter MUST NOT appear in the configuration file itself. |
| `input`                    | `<globpattern>`            |   n   | [Globpattern](https://en.wikipedia.org/wiki/Glob_(programming)#Syntax) string that specifies the set of (input) files that are to be processed as an absolute or relative path from where the tool is called. |
| `-o`<br/>`--output`        | `<dir>`                    |   Y   | Directory where output files are to be written. This directory is specified as an absolute or relative path from where the tool is called. |
| `-s`<br/>`--scopedir`      | `<path>`                   |   Y   | Path of the [scope directory](@) from which the tool is called. It MUST contain the [SAF](@) for that [scope](@), which we will refer to as the 'current scope' for the [TRRT](@). |
| `-int`<br/>`--interpreter` | `<type>` or `<regex>`      |   n   | Allows for the switching between existing and custom interpreter types. By default `alt` and `basic` are available, but a custom regex pattern may be provided. When this parameter is omitted, the basic [term ref](@) syntax is interpreted. See the [interpreter](customization#interpreter) section for more information. |
| `-con`<br/>`--converter`   | `<type>` or `<mustache>`   |   n   | The type of [converter](customization#converter) which creates the [renderable refs](@). Allows for the switching between existing and custom converter types. By default `html`, `essif` and `markdown` are available, but a custom [Mustache template](https://handlebarsjs.com/guide/) may be provided. When this parameter is omitted, the Markdown converter is used. See the [converter](customization#converter) section for more information. |
| `-V`<br/>`--version`       |                            |   n   | Output the version number of the tool. |
| `-f`<br/>`--force`         |                            |   n   | Allow overwriting of existing files. Meant to prevent accidental overwriting of files that include [term refs](@). |
| `-h`<br/>`--help`          |                            |   n   | Display usage and options help text. |


### Configuration File
Every parameter specified in the [options](#parameters-and-options) table above (except for `config`) can be set inside a yaml file. As an example, running the tool with the following command with the use of the `__tests__` files:

```bash
trrt --config __tests__/content/config.yaml
```

uses the example `config.yaml` file shown below. As a general guideline, we recommend storing the config files related to all terminology tools in the root of the [scope directory](@) where the [SAF](@) resides as well.

```yaml title="__tests__/content/config.yaml"
# TRRT configuration file (yaml)
output: '__tests__/output'
scopedir: '__tests__/content'
interpreter: '(?:(?<=[^`\\])|^)\[(?=[^@\]]+\]\([#a-z0-9_-]*@[:a-z0-9_-]*\))(?<showtext>[^\n\]@]+)\]\((?:(?<id>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]+))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+))?\)' # `alt` or `basic` are also valid values
converter: '<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}" title="{{glossaryText}}">{{showtext}}</a>' # `http`, `essif` or `markdown` are also valid values

# glob pattern strings for files to be processed
input:
  - '__tests__/content/terminology/*.md'
```

#### Master Configuration
The tool only interprets keys from the configuration file that are part of the defined [parameters](#parameters-and-options). Using this knowledge, we are able to create one configuration file to control all of the terminology tools. The configuration file of the tev2-specifications repository can be found [here](https://github.com/tno-terminology-design/tev2-specifications/blob/main/docs/config.yaml). In addition to using the options in the general section, the [TRRT](@) interprets it's own section. In this section, the yaml [block style indicator](https://yaml-multiline.info/) `>-` (replace newlines with spaces), is used to provide better readability of the converter option. In addition, the `--force` flag is provided as `force: true`.

For more practical examples, visit [deployment](deployment), or continue reading in [customization](customization) for information about the [interpreter](customization#interpreter) and [converter](customization#converter).
