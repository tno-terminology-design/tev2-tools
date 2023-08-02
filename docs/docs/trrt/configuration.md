Within the [TNO Terminology Design](@) effort, the [TRRT](@) is able to interpret and locate references to terms within documents, and convert them into so-called [renderable refs](@), according to its configuration and the contents of corresponding [MRGs](mrg@).

1. [Interpretation](#interpreter) happens through the use of regular expressions. These expressions are able to match the [term ref](@) syntaxes within documents, and store various variables as (named) capturing groups for use in the tool.
2. [Conversion](#converter) works by using Mustache templates. Any values from the standard [interpreters](#interpreter), and all properties supplied in the matching [MRG Entry](@), can be used as [Mustache expressions](https://handlebarsjs.com/guide/expressions).

## Parameters
The behavior of the [TRRT](@) can be configured per call e.g. by a [configuration file](#configuration%20file) and/or command-line parameters. The command-line syntax is as follows:

~~~bash
trrt [ <paramlist> ] [ <globpattern> ]
~~~

where:
- `<paramlist>` (optional) is a list of key-value pairs
- [`globpattern`](https://en.wikipedia.org/wiki/Glob_(programming)#Syntax) (optional) specifies a set of (input) files that are to be processed. If a [configuration file](#configuration%20file) is used, its contents may specify an additional set of input files to be processed.

<details>
  <summary>Legend</summary>

The columns in the following table are defined as follows:
1. **`Key`** is the text to be used as a key.
2. **`Value`** represents the kind of value to be used.
3. **`Req'd`** specifies whether (`Y`) or not (`n`) the field is required to be present when the tool is being called. If required, it MUST either be present in the configuration file, or as a command-line parameter.
4. **`Description`** specifies the meaning of the `Value` field, and other things you may need to know, e.g. why it is needed, a required syntax, etc.

</details>

| Key        | Value         | Req'd | Description |
| :--------- | :------------ | :---: | :---------- |
| `config`   | `<path>`        | n | Path (including the filename) of the tool's (YAML) configuration file. This file contains the key-value pairs to be used. Allowed keys (and the associated values) are documented in this table. Command-line arguments override key-value pairs specified in the configuration file. This parameter MUST NOT appear in the configuration file itself. |
| `input`    | `<globpattern>` | n | [Globpattern](https://en.wikipedia.org/wiki/Glob_(programming)#Syntax) string that specifies the set of (input) files that are to be processed. |
| `output`   | `<dir>`         | Y | Directory where output files are to be written. This directory is specified as an absolute or relative path. |
| `scopedir` | `<path>`        | Y | Path of the [scope directory](@) from which the tool is called. It MUST contain the [SAF](@) for that [scope](@), which we will refer to as the 'current scope' for the [TRRT](@). |
| `interpreter` | `<type>` or `<regex>`   | n | Allows for the switching between existing and custom interpreter types. By default `alt` and `basic` are available, but a custom PCRE regex pattern may be provided. When this parameter is omitted, the basic [term ref](@) syntax is interpreted. |
| `converter` | `<type>` or `<mustache>`   | n | The type of converter which creates the [renderable refs](@). Allows for the switching between existing and custom converter types. By default `http` and `markdown` are available, but a custom [Mustache template](https://handlebarsjs.com/guide/) may be provided. When this parameter is omitted, the Markdown converter is used. |
| `force` | | n | Allow overwriting of existing files. Meant to prevent accidental overwriting of files that include [term refs](@). |

### Configuration File
Every parameter specified above (except for `config`) can be set inside a yaml file. As an example, running the tool with the following command with the use of the `__tests__` files: 

```bash
trrt --config __tests__/content/config.yaml
```

uses the example `config.yaml` file shown below.

```yaml
# TRRT configuration file (yaml)
output: __tests__/output
scopedir: __tests__/content
interpreter: (?:(?<=[^`\\])|^)\[(?=[^@\]]+\]\([#a-z0-9_-]*@[:a-z0-9_-]*\))(?<showtext>[^\n\]@]+)\]\((?:(?<id>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]+))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+))?\) # `alt` or `basic` are also valid
converter: <a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}" title="{{glossaryText}}">{{showtext}}</a> # `http`, `essif` or `markdown` are also valid

# glob pattern strings for files to be processed
input:
  - __tests__/content/terminology/*.md
```

For more practical examples, visit [deployment](deployment).

## Interpreter
Different types of interpreters are present, allowing for the switching between the [basic syntax](/docs/tev2/spec-syntax/term-ref-syntax#basic-syntax) and [alternative syntax](/docs/tev2/spec-syntax/term-ref-syntax#alternative-syntax). To increase the flexibility of the [TRRT](@), a custom interpreter may also be set. All interpreters consist of a regular expression with named capturing groups that can store variables related to the [term ref](@) for later use in matching with a [MRG entry](@).

The [TRRT](@) interpreter attempts to obtain the [term ref](@) properties: `showtext`, `id`, `trait`, `scopetag`, and `vsntag`. If `id` is not set, `showtext` is converted to lowercase, `'()` characters are removed, and any non-alphabetic, non-numeric characters are replaced by a `-`, leaving only alphabetic, numeric, underscore or dash characters as part of `id`.

## Converter
Similar to the [interpreter](#interpreter), default converters are available, but custom ones may also be set. In this case they may be set through the use of [Mustache templates](https://handlebarsjs.com/guide/). Any values from the standard interpreters, and all properties supplied in the matching [MRG entry](@), can be used as [Mustache expressions](https://handlebarsjs.com/guide/expressions) (some contents enclosed using double curly braces `{{}}`). These template, which are handled by the [Handlebars](https://handlebarsjs.com/) package, provide a simple template to generate any text format.
The properties of the MRG entry that the [Mustache expressions](https://handlebarsjs.com/guide/expressions) may use, may also include expressions themselves. In addition, two [helper functions](#helper-functions) have been included to handle certain repeatable tasks.

**An example, which includes the use of [Mustache expressions](https://handlebarsjs.com/guide/expressions) and [helper functions](#helper-functions) is outlined below.**

Imagine the properties below are part of the [MRG entry](@) that describes a [curator](@). In this case we would like our external rendering tool to display text when a [renderable ref](@) is being hovered over.

```yaml
glossaryText: "a person responsible for [curating](@) the [terminologies](@) within a [scope](@), to ensure shared understanding among a [community](@) working together on a particular set of objectives."
hoverText: "{{term}}: {glossaryText}"
```

We have defined a custom converter template to make use of this `hoverText` property, which we have achieved by using [Mustache expressions](https://handlebarsjs.com/guide/expressions) in our converter string. The `hoverText` property is unformatted currently, using it will make it start without any capitalization (`term` property is lowercase), and will use the unresolved [term ref](@) syntaxes as included in the `glossaryText`. To tidy up the values we use the [helper functions](#helper-functions), and could even skip the use of the `hoverText` property all together by being smart with our custom converter.

```Handlebars
<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}" title="{{capFirst term}}: {{noRefs glossaryText}}">{{showtext}}</a>
```

The above converter will result in the `title` html element being filled with the following renderable string.

```
"Curator: a person responsible for Curating the Terminologies within a Scope, to ensure shared understanding among a Community working together on a particular set of objectives."
```

### Helper functions
Two [helper functions](https://handlebarsjs.com/guide/expressions.html#helpers) have been specified, which can be used within [Mustache expressions](https://handlebarsjs.com/guide/expressions) to modify the output of an expression. An example of using the `capFirst` and `noRefs` helpers inside a converter template can be seen at the [converter](#converter) section above. The input to a helper function is always the evaluated value of the expression that follows.

#### `capFirst`
This simple helper with identifier `capFirst` replaces every word's first character with the capitalized equivalent. Words are obtained by splitting the input on the ` ` (space) character. *It takes the input, splits the input on spaces, and capitalizes the first character of every split item, after which the output is returned*

#### `noRefs`
This helper with identifier `noRefs` uses the configured [interpreter](#interpreter) to convert all references to the `showtext` term property value. It also capitalizes the `showtext` replacement using the `capFirst` helper. *It takes the input, finds matches using the configured [interpreter](#interpreter) and uses the capitalized `showtext` property as a replacement, after which the output is returned.*

**For more information about the different syntaxes, template examples, [term ref](@) properties, and regexes, refer to the [TRRT](@) [specifications](link-to-specifications).**