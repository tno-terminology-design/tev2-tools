# Specifications

import useBaseUrl from '@docusaurus/useBaseUrl'

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<!-- Use 'Mark' as an HTML tag, e.g. <mark>text to mark</Mark?-->
export const mark = ({children}) => (
  <span style={{ color:'black', backgroundColor:'yellow', padding:'0.2rem', borderRadius:'2px', }}>
    {children}
  </span> );

:::caution
The entire section on Terminology Engine v 2 (TEv2) is still under construction.<br/>
As TEv2 is not (yet) available, the texts that specify the tool are still 'raw', i.e. not yet processed.<br/>[readers](@) will need to see through some (currently unprocessed) notational conventions.
:::

:::info Editor's note
Term ref resolution is the same process as we use for ingestion, and other conversions, as (will be) explained in the [profiles template section](profile-templates). When that 'conversion pattern' is stable and properly documented, we need to revise this section to align with those descriptions.
:::

The **Term Ref(erence) Resolution Tool ([TRRT](@))** takes files that contain so-called [term refs](@) and outputs a copy of these files in which these [term refs](@) are converted into so-called [renderable refs](@), i.e. texts that can be further processed by tools such as GitHub pages, Docusaurus, etc. The result of this is that the rendered document contains markups that help [readers](@) to quickly find more explanations of the [concept](@) or other [knowledge artifact](@) that is being referenced.

There is currently one implementation of the tool:
- the repo in which the tool is being developed is [here](https://github.com/tno-terminology-design/trrt/).
- the documentation is [here](https://tno-terminology-design.github.io/tev2-specifiations).

<details>
  <summary>Examples</summary>

Consider the [term ref](@) `[the purpose of actors](actor#purpose@essif-lab)`. Here are a number of ways that it can be converted into:

<Tabs
  defaultValue="markdown"
  values={[
    {label: 'Markdown', value: 'markdown'},
    {label: 'HTML', value: 'html'},
    {label: 'eSSIF-Lab Style', value: 'essiflab-style'},
  ]}>

<TabItem value="markdown">

~~~ markdown
  [the purpose of actors](/framework/docs/terms/actor#purpose)
~~~

which is text that a markdown interpreter will render into a text `the purpose of actors` that hyperlinks to the (relative) path `/framework/docs/terms/actor#purpose`.

</TabItem>
<TabItem value="html">

~~~ html
  <a href="/framework/docs/terms/actor#purpose">
    <span style="font-weight:bold">the purpose of actors</span>
  </a>,
~~~

which is code that will render the text `the purpose of actors` as a (boldface) hyperlink, that, when clicked, will navigate to the `purpose` section of the page that documents (the [knowledge artifact](@) called `actor`.

</TabItem>
<TabItem value="essiflab-style">

~~~ html
  <Term popup="An Actor is someone or something that can act, i.e. actually do things, execute actions, such as people or machines."
    reference="actor">the purpose of actors
  </Term>
~~~

Note that this text is not readily renderable in a browser. `<Term ...>` and `</Term>` represent a React component that supports linking and tooltip functionality, so that users hovering over the link will see a popup/tooltip with the text `<popuptext>`. This functionality is expected to be provided by an appropriate plugin in the static website generator.

</TabItem>
</Tabs>

</details>

Conceptually, [term ref](@) conversion is a simple two-step process:
1. The [term ref](@) is [interpreted](interpreter@), the result of which is a set of variables (or in the case of regexes, [named capturing groups](https://riptutorial.com/regex/example/2479/named-capture-groups)) whose contents [identify](@) an [MRG entry](@) from a specific [MRG](@).
2. Then, using the contents of the [identified](@) [MRG entry](@), the [term ref](@) is replaced by a [converter](@) with a [renderable ref](@), of the kind as specified by the [TRRT's](@) command line arguments or configuration file. Through the use of converters, the [renderable ref](@) may include all sorts of code that is processed further by other, third-party rendering tools.

By cleanly separating [term ref](@) interpretation from the part where it is overwritten with a [renderable ref](@), it becomes easy to extend the capabilities of the [TRRT](@) to include ways for rendering [term refs](@), e.g. for LaTeX, PDF, docx, odt and other formats, as well as for formats that we currently do not even know we would like to have.

In order to convert [term refs](@) into [renderable refs](@), the [TRRT](@) expects the [SAF](@) and the [MRG](@) of the [scope](@) from within which it is being called, to be available. The [MRG](@) is used to resolve all references to [terms](@) that are part of the [terminology](@) of this [scope](@). The [SAF](@) is used to locate the [MRGs](@) of any (other) [scope](@) whose [scopetag](@) is used as part of a [term ref](@) that needs to be resolved.

## Calling the Tool

The behavior of the [TRRT](@) can be configured per call e.g. by a configuration file and/or command-line parameters. The command-line syntax is as follows:

~~~
trrt [ <paramlist> ] [ <globpattern> ]
~~~

where:
- `<paramlist>` (optional) is a list of key-value pairs
- [`globpattern`](https://en.wikipedia.org/wiki/Glob_(programming)#Syntax) (optional) specifies a set of (input) files that are to be processed. If a configuration file is used, its contents may specify an additional set of input files to be processed.

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
| `interpreter` | `<type>` or `<regex>`   | n | Allows for the switching between existing and custom interpreter types. By default `alt` and `basic` are available, but a custom regex pattern may be provided. When this parameter is omitted, the basic [term ref](@) syntax is interpreted. |
| `converter` | `<type>` or `<mustache>`   | n | The type of converter which creates the [renderable refs](@). Allows for the switching between existing and custom converter types. By default `http` and `markdown` are available, but a custom [Mustache template](https://handlebarsjs.com/guide/) may be provided. When this parameter is omitted, the Markdown converter is used. |
| `force` | | n | Allow overwriting of existing files. Meant to prevent accidental overwriting of files that include [term refs](@). |

## Term Ref Resolution

The [term ref](@) resolution process has three steps:
1. Interpretation of the [term ref](@) into variables that can be used to [identify](@) an [MRG entry](@);
2. Locating the [identified](@) [MRG Entry](@);
3. Rewriting the [term ref](@) with a [renderable ref](@).

### Interpretation of the Term Ref

The following kinds of [term ref](@) syntaxes are supported:
- the [basic syntax](/docs/tev2/spec-syntax/term-ref-syntax#basic-syntax), i.e. \[`show text`\](`term`#`trait`@`scopetag`:`vsntag`);
- the [alternative syntax](/docs/tev2/spec-syntax/term-ref-syntax#alternative-syntax), e.g. \[`show text`@\], which basically moves the `@`-character from the basic syntax within the square brackets, which in many (if not most) cases is more convenient for [authors](@), but has the drawback that the rendering of the plain markdown text would be rendered as [show text@], which may be inconvenient.
- custom syntaxes interpreted by the `interpreter` parameter of the [TRRT](@) through the use of regular expressions.

Interpretation of a [term ref](@) leads to the population of the following variables:

<details>
<summary>Using regexes to find the values for the variables</summary>

Finding a [term ref](@) in the file can be done by using regular expressions (regexes - you can use [debuggex](https://www.debuggex.com/ to see what these regexps do (make sure you choose PCRE as the regex flavor to work with)).

- For the [basic syntax](/docs/tev2/spec-syntax/term-ref-syntax#basic-syntax), you can use the PCRE regex
  - [``(?:(?<=[^`\\])|^)\[(?=[^@\]]+\]\([#a-z0-9_-]*@[:a-z0-9_-]*\))``](https://www.debuggex.com/r/G1uvznpNG1mhqEx5) to find the `[` that starts a [term ref](@), and
  - [``(?<showtext>[^\n\]@]+)\]\((?:(?<id>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]+))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+))?\)``](https://www.debuggex.com/r/36D57uOvsnyPehh3) to find the various parts of the [term ref](@) as (named) capturing groups.

- For the [alternative syntax](/docs/tev2/spec-syntax/term-ref-syntax#alternative-syntax), you can use the PCRE regex
  - [``(?:(?<=[^`\\])|^)\[(?=[^@\]]+@[:a-z0-9_-]*\](?:\([#a-z0-9_-]+\))?)``](https://www.debuggex.com/r/7dEYEdoc52QeIxf4) to find the `[` that starts a [term ref](@), and
  - [``(?<showtext>[^\n\]@]+?)@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+?))?\](?:\((?<id>[a-z0-9_-]*)(?:#(?<trait>[a-z0-9_-]+?))?\))?``](https://www.debuggex.com/r/tMBiAk_W9ipNc9Mm) to subsequently obtain the various fields as (named) capturing groups from the PCRE regex.

Note that when a value of a named capturing group is empty, it is filled by the [TRRT](@) with (default) values according to the specifications below.
</details>

#### `showtext` (required) {#showtext}

`showtext` is a (non-empty) text that will be highlighed/enhanced, and will become clickable and/or receive other features when rendered. It MUST NOT be empty, and it MUST NOT contain the characters `@` or `]` (which we need to be able to distinguish between [term refs](@) and other links).

:::info Editor's note
The alternative notation assumes that the `showtext` part of a [term ref](@) won't contain the `@` character. However, it is likely that some [authors](@) will want to use an email address as the `showtext` part of a *regular* link, e.g. as in `[rieks.joosten@tno.nl](mailto:rieks.joosten@tno.nl)`. However, since [scopetags](@) should not contain `.`-characters, `[rieks.joosten@tno.nl]` does not qualify as a `showtext` in our syntax. Also, it would be detectable if such syntax is followed by `(mailto:`. Any detected problems must result in a proper warning, and the suggestion that email addresses can be used in a [link with angle brackets](https://www.markdownguide.org/basic-syntax/#urls-and-email-addresses), e.g. `<rieks.joosten@tno.nl>`.
:::

#### `scopetag` (optional) {#scopetag}

`scopetag` is a [scopetag](@) that [identifies](@) the [scope](@) within which the [term ref](@) is to be resolved.

If specified, it MUST appear in the [SAF](@) (of the [scope](@) from which the [TRRT](@) is called), as an element of the `scopetags` field of one of elements in the list of `scopes`. That element also contains a `scopedir` field, that can subsequently be used to obtain the [SAF](@) of that [scope](@).

If not specified, the current [scope](@) (from which the [TRRT](@) is being called) will be used. This SHOULD be the [scope](@) within which the document containing the [term ref](@) is being maintained. Note that the preceding `@` sign may never be omitted because as it serves the purpose to distinguish [term refs](@) from other [Markdown links](https://www.markdownguide.org/basic-syntax/#links). A `scopetag` shall only contain characters in regex `[a-z0-9_-]`.

#### `vsntag` (optional) {#vsntag}

`vsntag` is a [versiontag](@) that [identifies](@) the version of the [terminology](@) in the [scope](@) (as [identified] by the `scopetag`). It MUST appear either in the `vsntag` field, or as one of the elements in the `altvsntags` field of the [SAF](@) that contains the administration of that [scope](@).

If omitted (in which case the preceding `:`-character may also be omitted from the syntax), its value will [identify](@) the default [MRG](@) of the [scope](@) (as [specified](/docs/tev2/spec-files/saf#terminology) in the `mrgfile` field os the [SAF](@)).

#### `term` (optional) {#id}

`term` is a text that [identifies](@) a [knowledge artifact](@), and is specified in the [curated text](@) that documents that [artifact](knowledge-artifact@) (in a specific version of the  [terminology](@) of a specific [scope](@)). It will be matched against the `term` fields of [MRG entries](@) in the [MRG](@) that documents said [terminology](@).

If omitted, <!-- and the `term` field is empty as well, --> it is generated as follows (assuming the [MRG](@) to be used has already been [identified](@)):

- set `term`:=`showtext`;
- convert every character in the (regex) range `[A-Z]` to lower-case;
- convert every sequence of characters `[^A-Za-z_-]+` to (a single) `-` character;
- if the resulting `term` [matches an element in the list of texts](/docs/tev2/spec-syntax/form-phrase-syntax) in the `formphrases` field of an [MRG entry](@), then replace `term` with the contents of the `term`-field of that same [MRG entry](@).

:::info Editor's note
We should clarify the extent to which this `matching` supports formphrase macro's, Currently, this is documented as part of the [form-phrase syntax](/docs/tev2/spec-syntax/form-phrase-syntax) which doesn't seem right.
:::

It is an error if the resulting `term` does not [identify](@) an [MRG entry](@) in the selected [MRG](@). This may mean that the `showtext` has misspellings, the `term` field was not specified where it had to, or the list of `formphrases` in some [MRG entry](@) should have included more elements.

:::info Editor's note
[The Porter Stemming Algorithm](https://tartarus.org/martin/PorterStemmer/) is a process for removing the commoner morphological and inflexional endings from words in English. Its main use is as part of a term normalisation process that is usually done when setting up Information Retrieval systems. The mentioned site links to lots of freely useable code that the TRRT might want to consider using.

Perhaps the [TRRT](@) may use this tool as a means for generating the `term` field from the `showtext` if necessary. However, we would need to first experiment with that to see whether or not, c.q. to what extent this conversion does what it is expected to do.
:::

#### `trait` (optional) {#trait}

`trait` [identifies](@) a particular kind of descriptive text that is associated with the [knowledge artifact](@). If specified, it must be one of the elements in the list of headingid's as specified in [the `headingids` field](/docs/tev2/spec-files/mrg#mrg-entries) of the [MRG entry](@). If omitted, the preceding `#`-character should also be omitted.

### Locating the identified MRG Entry

As soon as the variables have been provided with a value, the [MRG entry](@) can be found by following a sequence of steps:

1. **read the [SAF](@) inside the supplied [scopedir](@)**. Thanks to the [MRG Import Tool](@) we can assume that all [MRGs](@) that may need to be consulted are located in the [glossarydir](@) and can be populated inside the runtime glossary of the [TRRT](@).

2. **find the matching [MRG entry](@) in the runtime glossary**. Based on the `term`, `scopetag` and `vsntag` variables of the [term ref](@), an entry in the glossary can be matched. `Altvsntags` may also be used in the runtime glossary for matching during this step. If the resulting set contains exactly one [MRG entry](@), this is the one that is selected; otherwise, a warning is raised.

### Converting the Term Ref to a Renderable Ref

The text with which the [term ref](@) is to be replaced can have various formats. This behavior can be customized by supplying a Mustache template to the `converter` parameter. This enables the [TRRT](@) to be used in different contexts, and its results to be further processed by a variety of third-party rendering tools.

Any values from the standard interpreters and all properties supplied in the matching [MRG Entry](@) can be used as [Mustache expressions](https://handlebarsjs.com/guide/expressions).
 
<details>
  <summary>Examples of term-ref converters</summary>

<Tabs
  defaultValue="markdown"
  values={[
    {label: 'Markdown Style', value: 'markdown'},
    {label: 'HTML Style', value: 'html'},
  ]}>

<TabItem value="markdown">

The simplest example is where a [term ref](@) is replaced with a regular [markdown link](https://www.markdownguide.org/basic-syntax/#links) according to the template below.

[`[{{showtext}}]({{navurl}}{{#trait}}#{{/trait}}{{trait}})`](https://handlebarsjs.com/playground.html#format=1&currentExample=%7B%22template%22%3A%22%5B%7B%7Bshowtext%7D%7D%5D(%7B%7Bnavurl%7D%7D%7B%7B%23trait%7D%7D%23%7B%7B%2Ftrait%7D%7D%7B%7Btrait%7D%7D)%5Cn%22%2C%22partials%22%3A%5B%5D%2C%22input%22%3A%22%7B%5Cn%20%20showtext%3A%20%5C%22show%20text%5C%22%2C%5Cn%20%20navurl%3A%20%5C%22https%3A%2F%2Fexample.com%2Fdocs%2Fterminology%2Fspecification.md%5C%22%2C%5Cn%20%20trait%3A%20%5C%22summary%5C%22%2C%5Cn%7D%5Cn%22%2C%22output%22%3A%22%5Bshow%20text%5D(https%3A%2F%2Fexample.com%2Fdocs%2Fterminology%2Fspecification.md%23summary)%5Cn%22%2C%22preparationScript%22%3A%22%22%2C%22handlebarsVersion%22%3A%224.7.7%22%7D)

In this case, the [term ref](@) `[Actions](@)` is replaced with ``[Actions](/<navurl>#action)``,
where `navurl` is gathered from the matching [MRG entry](@). The trait leading with a `#` is attached if a trait happens to be set.

</TabItem>
<TabItem value="html">

A more complex example is what is done within eSSIF-Lab, where the [curators](@) not only want [terms](@) to be linked to their (rendered) [curated texts](@), but also want them to be provided with a tooltip that states their [definitions](@). This can be achieved by using the template below.

```Handlebars
<Term reference="{{term}}" popup="{{popuptext}}">{{showtext}}</Term>
```

In this [scope](@), the [term ref](@) `[Actions](@)` is replaced with `<Term reference="action" popup="<popuptext>">Actions</Term>` where:

- `<popuptext>` is the text provided in the properties of the [MRG entry](@) whose `term` field is `action`, and
- `<Term ...>` and `</Term>` represent a React component that supports linking and tooltip functionality, so that users hovering over the link will see a popup/tooltip with the text `<popuptext>`, and will navigate to the location of the (human readable, i.e. rendered) file that contains details and further explanations, as specified in the `navurl` field of the [MRG entry](@).

</TabItem>
</Tabs>

</details>

## Processing, Errors and Warnings

The [TRRT](@) starts by reading its command-line and configuration file. If the command-line has a key that is also found in the configuration file, the command-line key-value pair takes precedence. The resulting set of key-value pairs is tested for proper syntax and validity. Every improper syntax and every invalidity found will be logged. Improper syntax may be e.g. an invalid [globpattern](https://en.wikipedia.org/wiki/Glob_(programming)#Syntax). Invalidities include non-existing directories or files, lack of write-permissions where needed, etc.

Then, the [TRRT](@) reads the specified input files (in arbitrary order), and for each of them, produces an output file that is the same as the input file except for the fact that all [term refs](@) have been replaced with texts that are to be used by third-party rendering tools for enhanced rendering of such links. An example of this would be text that can be used to enhance a link with a popup that contains the definition, or a description of the [term](@) that is being referenced.

The [TRRT](@) logs every error- and/or warning condition that it comes across while processing its configuration file, commandline parameters, and input files, in a way that helps tool-operators and document [authors](@) to identify and fix such conditions.

## Deploying the Tool

The [TRRT](@) comes with documentation that enables developers to ascertain its correct functioning (e.g. by using a test set of files, test scripts that exercise its parameters, etc.), and also enables them to deploy the tool in a git repo and author/modify CI-pipes to use that deployment.

## Discussion Notes

This section contains some notes of a discussion between Daniel and Rieks on these matters of some time ago.

- A ToIP [glossary](@) will be put by default at `http://trustoverip.github.io/<terms-community>/glossary`, where `<terms-community>` is the name of the [terms-community](@). This allows every  [terms-community](@) to have its own [glossary](@). However, the above specifications allow [terms-communities](terms-community@) to [curate](@) multiple [scopes](scope@).
- Storing [glossaries](glossary@) elsewhere was seen to break the (basic workings of the postprocessing tool, but the above specifications would fix that).
- Entries, e.g. 'foo' can be referenced as `http://trustoverip.github.io/<community>/[glossary](@)#foo` (in case of a standalone glossary), and `http://trustoverip.github.io/<community>/document-that-includes-glossary-fragment#foo` (in case of a fragmented glossary).
- There will be a new convention for content [authors](@) who want to reference [terms](term@) (let's call it the 'short form'). This topic is fully addressed above, and extended to be a bit more generic.
- do we expect [glossaries](glossary@) that are generated by a [terms-community](@) to live at a fixed place (how do people find it, refer to its contents)? This topic is addressed
- once [glossaries](glossary@) are generated, the idea is that all artifacts produced in a [terms-community](@) can use references to the [terms](term@) in the generated [glossaries](glossary@), e.g.:
  - confluence pages: we need to see how such pages can be processed. [Authors](@) can remove links like they do now, they could use [term refs](@) as they see fit and then run TRRT.
  - github pages (e.g. https://github.com/trustoverip/ctwg-terms). Check (it's a github repo).
  - github wiki pages (e.g. https://github.com/trustoverip/ctwg-terms/wiki). Check (it's a github repo).
  - github wiki home pages (e.g. https://github.com/trustoverip/ctwg-terms/wiki/Home). Check (it's a github repo).
  - github-pages pages (e.g. https://github.com/trustoverip/ctwg-terms/docs)
- We could also see GGT and TRRT to be extended, e.g. to work in conjunction with LaTeX or word-processor documents. This needs some looking into, but [pandoc](https://pandoc.org/) may be useful here.
