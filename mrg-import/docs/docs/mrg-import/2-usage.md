# Usage

The behavior of the [MRG importer](@) can be configured per call e.g. by a configuration file and/or command-line parameters. The command-line syntax is as follows.

~~~bash
mrg-import [ <paramlist> ]
~~~

where:
- `<paramlist>` (optional) is a list of key-value pairs

## Parameters and Options

<details>
  <summary>Legend</summary>

The columns in the following table are defined as follows:
1. **`Key`** is the text to be used as a key.
2. **`Value`** represents the kind of value to be used.
3. **`Req'd`** specifies whether (`Y`) or not (`n`) the field is required to be present when the tool is being called. If required, it MUST either be present in the configuration file, or as a command-line parameter.
4. **`Description`** specifies the meaning of the `Value` field, and other things you may need to know, e.g. why it is needed, a required syntax, etc.

</details>

| Key                     | Value      | Req'd | Description |
| :---------------------- | :--------- | :---: | :---------- |
| `-c`<br/>`--config`     | `<path>`   |   n   | Path (including the filename) of the tool's (YAML) [configuration file](#configuration-file) as an absolute or relative path from where the tool is called. This file contains the key-value pairs to be used. Allowed keys (and the associated values) are documented in this table. Command-line arguments override key-value pairs specified in the [configuration file](#configuration-file). This parameter MUST NOT appear in the [configuration file](#configuration-file) itself. |
| `-s`<br/>`--scopedir`   | `<path>`   |   Y   | Path of the [scope directory](@) from which the tool is called. It MUST contain the [SAF](@) for that [scope](@), which we will refer to as the 'own scope' for the [MRG Import Tool](@). |
| `-o`<br/>`--onNotExist` | `<action>` |   n   | Specifies the action to take in case an [MRG](@) file that was expected to exist, does not exist. Default is `throw`. |
| `-V`<br/>`--version`    |            |   n   | Output the version number of the tool. |
| `-h`<br/>`--help`       |            |   n   | Display usage and options help text. |

The `<action>` parameter can take the following values.

| `<action>` | Description |
| :--------- | :---------- |
| `'throw'`  | An error is thrown (an exception is raised), and processing will stop. |
| `'warn'`   | A message is displayed (and logged) and processing continues. |
| `'log'`    | A message is written to a log(file) and processing continues. |
| `'ignore'` | Processing continues as if nothing happened. |

### (URL) Handling

The use of URL's are very important within the [MRG importer](@). Where possible, URL's that the tool uses are used as parsed URL's so they can be clicked on inside the console output. As of right now, HTTP requests for obtaining files from import scopes do not support authentication. The download function is able to determine the 'raw' URL from a normal Git URL through the use of the [git-url-parse](https://www.npmjs.com/package/git-url-parse) package, after which the raw URL contents are requested through the [axios](https://www.npmjs.com/package/axios) HTTP client.

The conversion of normal URL's to raw URL's is currently supported for the following platforms.
- [GitHub](https://github.com/) (no authentication)
- [GitLab](https://gitlab.com/) (no authentication)

If an unsupported platform is used, no conversion is done and the tool assumes a URL points to a raw file.

```yaml title="Example conversion"
https://github.com/essif-lab/framework/tree/master/docs/saf.yaml
# to
https://raw.githubusercontent.com/essif-lab/framework/master/docs/saf.yaml
```


### Configuration File
Every parameter specified in the [options](#parameters-and-options) table above (except for `config`) can be set inside a yaml file. As an example, running the tool with the following command with the use of the `__tests__` files:

```bash
mrg-import --config __tests__/content/config.yaml
```

uses the example `config.yaml` file shown below. As a general guideline, we recommend storing the config files related to all terminology tools in the root of the [scope directory](@) where the [SAF](@) resides as well.

```yaml title="__tests__/content/config.yaml"
# MRG Import Tool configuration file (yaml)
scopedir: __tests__/content
onNotExist: throw
```

#### Master Configuration
The tool only interprets keys from the configuration file that are part of the defined [parameters](#parameters-and-options). Using this knowledge, we are able to create one configuration file to control all of the terminology tools. The configuration file of the tev2-specifications repository can be found [here](https://github.com/tno-terminology-design/tev2-specifications/blob/main/docs/config.yaml). In the file, no seperate configuration section is dedicated to the mrg-import tool as the general `scopedir` and `onNotExist` options are enough to execute the tool.

For more practical examples, continue reading in [deployment](deployment).
