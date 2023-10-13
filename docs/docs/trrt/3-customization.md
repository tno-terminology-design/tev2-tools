# Customization

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Within the [TNO Terminology Design](@) effort, the [TRRT](@) is able to interpret and locate references to terms within documents, and convert them into so-called [renderable refs](@), according to its configuration and the contents of corresponding [MRGs](mrg@).

1. [Interpretation](#interpreter) happens through the use of regular expressions. These expressions are able to match the [term ref](@) syntaxes within documents, and store various variables as (named) capturing groups for use in the tool.
2. [Conversion](#converter) works by using Mustache templates. Any values from the standard [interpreters](#interpreter), and all properties supplied in the matching [MRG Entry](@), can be used as [Mustache expressions](https://handlebarsjs.com/guide/expressions).

## Interpreter
Different types of interpreters are present, allowing for the switching between the [basic syntax](specifications#interpretation-of-the-term-ref) and [alternative syntax](specifications#interpretation-of-the-term-ref). To increase the flexibility of the [TRRT](@), a custom interpreter may also be set. All interpreters consist of a PCRE regular expression with named capturing groups that can store variables related to the [term ref](@) that are used to match an [MRG entry](@).

The [TRRT](@) interpreter attempts to obtain the [term ref](@) properties: `showtext`, `id`, `trait`, `scopetag`, and `vsntag`. If `id` is not set, `showtext` is converted to lowercase, `'()` characters are removed, and any non-alphabetic, non-numeric characters are replaced by a `-`, leaving only alphabetic, numeric, underscore or dash characters as part of `id`.

<details>
  <summary>Examples</summary>

Setting interpreters mainly allows for the use of different [term ref](@) syntaxes. As long as the basic properties listed above can be obtained from the [term ref](@), any custom interpreter may be set. When a value of a named capturing group is empty, it is filled by the [TRRT](@) with (default) values according to the [specifications](specifications#interpretation-of-the-term-ref). The following examples attempt to illustrate the differences between the default, alternative and custom interpreters. 

<Tabs
  defaultValue="basic"
  values={[
    {label: 'Basic', value: 'basic'},
    {label: 'Alternative', value: 'alternative'},
    {label: 'Custom', value: 'custom'},
  ]}>

<TabItem value="basic">

**Syntax**<br/>
\[`show text`\](@)<br/>
\[`show text`\](`showtext`@`scopetag`)<br/>
\[`show text`\](`term`#`trait`@`scopetag`:`vsntag`)<br/>

**Information**<br/>
The default/basic interpreter uses a regex that can find [term refs](@) using the [basic syntax](specifications#interpretation-of-the-term-ref) as displayed here above. Not specifying an interpreter, or using '`basic`' as the value of the interpreter, sets the regex displayed below as the interpreter.

~~~regex
(?:(?<=[^`\\])|^)\[(?=[^@\]]+\]\([#a-z0-9_-]*@[:a-z0-9_-]*\))
(?<showtext>[^\n\]@]+)\]\((?:(?<id>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]+))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+))?\)
~~~

The first part of the regex pattern (displayed on the first line) is responsible for finding the start of a term ref using the [basic syntax](specifications#interpretation-of-the-term-ref). The second part of the regex pattern finds the various parts of the [term ref](@) and stores them as named capturing groups.

</TabItem>
<TabItem value="alternative">

**Syntax**<br/>
\[`show text`@\]<br/>
\[`show text`@`scopetag`\]<br/>
\[`show text`@`scopetag`:`vsntag`\](`term`#`trait`)

**Information**<br/>
The alternative interpreter uses a regex that can find [term refs](@) using the [alternative syntax](specifications#interpretation-of-the-term-ref) as displayed here above. Using '`alternative`' as the value of the interpreter, sets the regex displayed below as the interpreter.

The alternative syntax moves the `@`-character from the basic syntax within the square brackets. This is particularly useful in the vast majority of cases, where the default processing of `showtext` results in `term`, and `trait` is absent.

~~~regex
(?:(?<=[^`\\])|^)\[(?=[^@\]]+@[:a-z0-9_-]*\](?:\([#a-z0-9_-]+\))?)
(?<showtext>[^\n\]@]+?)@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+?))?\](?:\((?<id>[a-z0-9_-]*)(?:#(?<trait>[a-z0-9_-]+?))?\))?
~~~

Similar to the other example interpreters, the first part of the regex pattern (displayed on the first line) is responsible for finding the start of a term ref and the second part of the regex pattern finds the various parts of the [term ref](@) and stores them as named capturing groups.

</TabItem>
<TabItem value="custom">

:::caution

Writing custom interpreters is a precise task. Please make sure you understand the [specifications](specifications) of the [TRRT](@), and have a solid grasp on using regular expressions. When using the [yaml config file](usage#configuration-file) also pay close attention to the way in which newlines are interpreted.

:::

**Syntax**<br/>
\ref{`show text`@}<br/>
\ref{`show text`@`scopetag`}<br/>
\ref{`show text`@`scopetag`:`vsntag`}(`term`#`trait`)

**Information**<br/>
Custom interpreters allow for the ability to use any kind of syntax to obtain the necessary [term ref](@) properties. The lines above show a combination of the `\ref{}` object referencing syntax used in LaTeX and the alternative syntax. Properties of this custom [term ref](@) syntax can be interpreted using the regex pattern below.

```regex
(?:(?<=[^`\\])|^)\\ref{(?=[^@\}]+[:a-z0-9_-]*\}?)
(?<showtext>[^\n\}@]+?)@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+?))?\}(?:\((?<id>[a-z0-9_-]*)(?:#(?<trait>[a-z0-9_-]+?))?\))?
```
Similar to the other example interpreters, the first part of the regex pattern (displayed on the first line) is responsible for finding the start of a term ref and the second part of the regex pattern finds the various parts of the [term ref](@) and stores them as named capturing groups.<br/>

</TabItem>
</Tabs>

</details>

## Converter
Similar to the [interpreter](#interpreter), default converters are available, but custom ones may also be set. In this case they may be set through the use of [Mustache templates](https://handlebarsjs.com/guide/). Any values (named capturing groups) from the standard interpreters, and all properties supplied in the matching [MRG entry](@), can be used as [Mustache expressions](https://handlebarsjs.com/guide/expressions) (some contents enclosed using double curly braces `{{}}`). These template, which are handled by the [Handlebars](https://handlebarsjs.com/) package, provide a "simple" template to generate any text format.<br/>
The properties of the MRG entry that the [Mustache expressions](https://handlebarsjs.com/guide/expressions) may use, may also include expressions themselves. In addition, multiple [helper functions](#helper-functions) have been included to handle certain repetitive tasks.

**A pre-configured [Handlebars](https://handlebarsjs.com/) playground can be found [here](https://handlebarsjs.com/playground.html#format=1&currentExample=%7B%22template%22%3A%22-%20Markdown%3A%20%5B%7B%7Bshowtext%7D%7D%5D(%7B%7Bnavurl%7D%7D%7B%7B%23trait%7D%7D%23%7B%7B%2Ftrait%7D%7D%7B%7Btrait%7D%7D)%5Cn-%20HTML%3A%20%3Ca%20href%3D%5C%22%7B%7Bnavurl%7D%7D%7B%7B%23trait%7D%7D%23%7B%7B%2Ftrait%7D%7D%7B%7Btrait%7D%7D%5C%22%3E%7B%7Bshowtext%7D%7D%3C%2Fa%3E%5Cn-%20eSSIF-Lab%3A%20%3Ca%20href%3D%5C%22%7B%7Bnavurl%7D%7D%7B%7B%23trait%7D%7D%23%7B%7B%2Ftrait%7D%7D%7B%7Btrait%7D%7D%5C%22%20title%3D%5C%22%7B%7BcapFirst%20term%7D%7D%3A%20%7B%7BnoRefs%20glossaryText%7D%7D%5C%22%3E%7B%7Bshowtext%7D%7D%3C%2Fa%3E%5Cn-%20Custom%3A%20%7B%7B%23ifValue%20termType%20equals%3D%5C%22concept%5C%22%7D%7D%3Ca%20href%3D%5C%22%7B%7Bnavurl%7D%7D%7B%7B%23trait%7D%7D%23%7B%7B%2Ftrait%7D%7D%7B%7Btrait%7D%7D%5C%22%3E%7B%7Bshowtext%7D%7D%3C%2Fa%3E%7B%7B%2FifValue%7D%7D%7B%7B%23ifValue%20termType%20equals%3D%5C%22image%5C%22%7D%7D%3Cimg%20src%3D%5C%22%7B%7Blocator%7D%7D.jpg%5C%22%20alt%3D%5C%22%7B%7Bshowtext%7D%7D%5C%22%20width%3D%5C%22500%5C%22%20height%3D%5C%22600%5C%22%3E%7B%7B%2FifValue%7D%7D%5Cn%22%2C%22partials%22%3A%5B%5D%2C%22input%22%3A%22%7B%5Cn%20%20showtext%3A%20%5C%22Curators%5C%22%2C%5Cn%20%20trait%3A%20%5C%22examples%5C%22%2C%5Cn%20%20term%3A%20%5C%22curator%5C%22%2C%5Cn%20%20scopetag%3A%20%5C%22termdsn%5C%22%2C%5Cn%20%20vsntag%3A%20%5C%22main%5C%22%2C%5Cn%20%20termType%3A%20%5C%22concept%5C%22%2C%5Cn%20%20glossaryTerm%3A%20%5C%22Curator%20(of%20a%20Scope)%5C%22%2C%5Cn%20%20glossaryText%3A%20%5C%22a%20person%20responsible%20for%20%5Bcurating%5D(%40)%20the%20%5Bterminologies%5D(%40)%20within%20a%20%5Bscope%5D(%40)%2C%20to%20ensure%20shared%20understanding%20among%20a%20%5Bcommunity%5D(%40)%20working%20together%20on%20a%20particular%20set%20of%20objectives.%5C%22%2C%5Cn%20%20grouptags%3A%20%5C%22terminology%5C%22%2C%5Cn%20%20locator%3A%20%5C%22curator%5C%22%2C%5Cn%20%20navurl%3A%20%5C%22terminology%2Fcurator.md%5C%22%5Cn%7D%5Cn%22%2C%22output%22%3A%22-%20Markdown%3A%20%5BCurators%5D(terminology%2Fcurator.md%23examples)%5Cn-%20HTML%3A%20%3Ca%20href%3D%5C%22terminology%2Fcurator.md%23examples%5C%22%3ECurators%3C%2Fa%3E%5Cn-%20eSSIF-Lab%3A%20%3Ca%20href%3D%5C%22terminology%2Fcurator.md%23examples%5C%22%20title%3D%5C%22Curator%3A%20a%20person%20responsible%20for%20Curating%20the%20Terminologies%20within%20a%20Scope%2C%20to%20ensure%20shared%20understanding%20among%20a%20Community%20working%20together%20on%20a%20particular%20set%20of%20objectives.%5C%22%3ECurators%3C%2Fa%3E%5Cn-%20Custom%3A%20%3Ca%20href%3D%5C%22terminology%2Fcurator.md%23examples%5C%22%3ECurators%3C%2Fa%3E%5Cn%22%2C%22preparationScript%22%3A%22const%20pattern%20%3D%20'%2F(%3F%3A%5B%5E%60%5C%5C%5C%5C%5C%5C%5C%5C%5D%7C%5E)%5C%5C%5C%5C%5B(%3F%3D%5B%5E%40%5C%5C%5C%5C%5D%5D%2B%5C%5C%5C%5C%5D%5C%5C%5C%5C(%5B%23a-z0-9_-%5D*%40%5B%3Aa-z0-9_-%5D*%5C%5C%5C%5C))(%3F%3Cshowtext%3E%5B%5E%5C%5C%5C%5Cn%5C%5C%5C%5C%5D%40%5D%2B)%5C%5C%5C%5C%5D%5C%5C%5C%5C((%3F%3A(%3F%3Cid%3E%5Ba-z0-9_-%5D*)%3F(%3F%3A%23(%3F%3Ctrait%3E%5Ba-z0-9_-%5D%2B))%3F)%3F%40(%3F%3Cscopetag%3E%5Ba-z0-9_-%5D*)(%3F%3A%3A(%3F%3Cvsntag%3E%5Ba-z0-9_-%5D%2B))%3F%5C%5C%5C%5C)%2Fg'%3B%5Cn%2F%2F%20Basic%20Term%20Ref%20syntax%2C%20but%20with%20escaped%20symbols%20to%20function%20correctly%5Cn%5Cnfunction%20noRefsHelper(text)%20%7B%5Cn%20%5Ctlet%20regex%20%3D%20new%20RegExp(pattern.replace(%2F%5E%5C%5C%2F%7C%5C%5C%2F%5Ba-z%5D*%24%2Fg%2C%20'')%2C%20'g')%3B%5Cn%20%20%20%20let%20matches%20%3D%20Array.from(text.matchAll(regex))%3B%5Cn%20%20%20%20if%20(matches.length%20%3E%200)%20%7B%5Cn%20%20%20%20%20%20%20%20%2F%2F%20Iterate%20over%20each%20match%20found%20in%20the%20text%20string%5Cn%20%20%20%20%5Ctfor%20(const%20match%20of%20matches)%20%7B%5Cn%20%20%20%20%20%20%20%20%20%20%20%20if%20(match.groups.showtext)%20%7B%5Cn%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%2F%2F%20replace%20the%20match%20with%20the%20showtext%20property%20and%20make%20the%20first%20letter%20capitalized%5Cn%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20text%20%3D%20text.replace(match%5B0%5D%2C%20capFirstHelper('%20'%20%2B%20match.groups.showtext))%3B%5Cn%20%20%20%20%20%20%20%20%20%20%20%20%7D%5Cn%20%20%20%20%20%20%20%20%7D%5Cn%20%20%20%20%7D%5Cn%20%20%20%20return%20text%3B%5Cn%7D%5Cn%5Cnfunction%20capFirstHelper(text)%20%7B%5Cn%5Ctconst%20words%20%3D%20text.split('%20')%3B%5Cn%20%20%20%20const%20capitalizedWords%20%3D%20words.map((word)%20%3D%3E%5Cn%20%20%20%20%5Ctword.charAt(0).toUpperCase()%20%2B%20word.slice(1)%5Cn%20%20%20%20)%3B%5Cn%20%20%20%20return%20capitalizedWords.join('%20')%3B%5Cn%7D%5Cn%5Cnfunction%20ifValueHelper(conditional%2C%20options)%20%7B%5Cn%20%20if%20(conditional%20%3D%3D%20options.hash.equals)%20%7B%5Cn%20%20%20%20return%20options.fn(this)%3B%5Cn%20%20%7D%5Cn%20%20else%20%7B%5Cn%20%20%20%20return%20options.inverse(this)%3B%5Cn%20%20%7D%5Cn%7D%5Cn%5CnHandlebars.registerHelper('noRefs'%2C%20noRefsHelper)%3B%5CnHandlebars.registerHelper('capFirst'%2C%20capFirstHelper)%3B%5CnHandlebars.registerHelper('ifValue'%2C%20ifValueHelper)%3B%5Cn%22%2C%22handlebarsVersion%22%3A%224.7.8%22%7D), this playground includes the [helper functions](#helper-functions) and also matches the example cases outlined below.** Note that although an [MRG entry](@) allows [Mustache expressions](https://handlebarsjs.com/guide/expressions) in its property values, the `input` box in the playground does not.

:::info

The converter used inside the TNO Terminology Design repositories is more elaborate than the examples outlined below. The converter used can be found in the tev2-specifications repository inside its toolbox configuration file found [here](https://github.com/tno-terminology-design/tev2-specifications/blob/main/docs/config.yaml).

:::


<details>
  <summary>Examples</summary>

Every explored example uses the following (simplified) [MRG entry](@) properties. The converter also has access to the properties of the [term ref](@), which in this case is the term [Curator](@).<br/>
For the examples, we imagine that the following [term ref](@), using the [basic syntax](specifications#interpretation-of-the-term-ref), was found by the interpreter: \[`Curators`\](#`examples`@`termdsn`:`main`).

<details>
  <summary>MRG Entry</summary>

```yaml
-
  term: 'curator'
  scopetag: 'termdsn'
  vsntag: 'main'
  termType: 'concept'
  glossaryTerm: 'Curator (of a Scope)'
  glossaryText: 'a person responsible for [curating](@) the [terminologies](@) within a [scope](@), to ensure shared understanding among a [community](@) working together on a particular set of objectives.'
  hoverText: '{{capFirst term}}: {{noRefs glossaryText}}'
  grouptags: 'terminology'
  formPhrases: 'curator{ss}, terminology-curator{ss}'
  navurl: 'terms/curator.md'
  headingids:
    - 'curator-of-a-scope'
    - 'examples'
    - 'notes'
-
```

</details>

<Tabs
  defaultValue="markdown"
  values={[
    {label: 'Markdown', value: 'markdown'},
    {label: 'HTML', value: 'html'},
    {label: 'eSSIF-Lab', value: 'essif'},
    {label: 'Custom', value: 'custom'},
  ]}>

<TabItem value="markdown">

The most basic converter can be used by not specifiying a converter, or by setting '`markdown`', or the template string below, as the value of `converter`. In this case, the original `showtext` of the [term ref](@) properties is used in addition to the `navurl` property of the [MRG entry](@), with the `trait` property of the [term ref](@) (leading with a `#`-character) being added if it is available.

```hbs title="Markdown Mustache template"
 [{{showtext}}]({{navurl}}{{#trait}}#{{/trait}}{{trait}})
```

Resulting in the following [renderable ref](@) Markdown that, when rendered, results in a hyperlink to the `navurl`.

**[Curators]\(terms/curator.md#examples)**


</TabItem>
<TabItem value="html">

The HTML converter can be used by setting '`html`', or the template string below, as the value of `converter`. Similar to the Markdown converter, the original `showtext` of the [term ref](@) properties is used in addition to the `navurl` [MRG entry](@) property with the `trait` [term ref](@) property, leading with a `#`-character, being added if it is available.

```hbs title="HTML Mustache template"
 <a
 href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}"
 >{{showtext}}</a>
```

Resulting in the following [renderable ref](@) HTML `<a>` tag that defines a hyperlink to the `navurl`.<br/>

```html
 <a href="terms/curator.md#examples">Curators</a>
```

</TabItem>
<TabItem value="essif">

This example converter can be used by setting '`essif`', or the template string below, as the value of `converter`. In this case we would like our external rendering tool to display text when a [renderable ref](@) is being hovered over in a HTML context.

The `glossaryText` property in the [MRG entry](@) is unformatted currently; using it as the 'hover text' will make it start without any capitalization (`term` property is lowercase), and will use the unresolved [term ref](@) syntaxes (i.e., \[curating\](@)) as included in the `glossaryText`. To tidy up the values we use the [helper functions](#helper-functions), and skip the use of the `hoverText` property all together by being smart with our custom converter.

```hbs title="eSSIF Mustache template"
 <a
 href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}"
 title="{{capFirst term}}: {{noRefs glossaryText}}">{{showtext}}</a>
```

The above converter will result in the `title` html element being filled with the following renderable string.

```
 "Curator: a person responsible for Curating the Terminologies within a Scope, to ensure shared understanding among a Community working together on a particular set of objectives."
```

Resulting in the following [renderable ref](@) HTML `<a>` tag (multiline example for better readability) that defines a hyperlink to the `navurl` and can display a text on **<u title="Curator: a person responsible for Curating the Terminologies within a Scope, to ensure shared understanding among a Community working together on a particular set of objectives.">hover</u>**.

```html
<a
href="terms/curator.md#examples" 
title="Curator: a person responsible for Curating the Terminologies within a Scope, to ensure shared understanding among a Community working together on a particular set of objectives."
>Curators</a>
```

</TabItem>
<TabItem value="custom">

This example uses the [`ifValue`](#ifvalue) helper to conditionally render a block based on the `termType` [MRG entry](@) property value. When the type is of value `concept`, a converter similar to the HTML example is displayed. When the type is of value `image`, an image is displayed using the value of `locator`. The converter below attempts to show the creative possibilities of using the converters, expressions and helper functions.

```hbs title="Custom Mustache template"
 {{#ifValue termType equals="concept"}}<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}">{{showtext}}</a>{{/ifValue}}
 {{#ifValue termType equals="image"}}<img src="{{locator}}.jpg" alt="{{showtext}}" width="500" height="600">{{/ifValue}}
```

Resulting in the following [renderable ref](@) HTML `<a>` or `<img>` tag that defines a hyperlink or an image based on the `termType` [MRG entry](@) property value.

```html
 <a href="terms/curator.md#example">Curators</a>
 or
 <img src="curator.jpg" alt="Curators" width="500" height="600">
```

By changing the value of property `termType` in the `input` of the abovementioned [playground](#converter), the changed `output` should be visible instantly.

</TabItem>

</Tabs>

</details>

### Helper functions
Multiple custom [helper functions](https://handlebarsjs.com/guide/expressions.html#helpers) have been specified in addition to the [built-in helper functions](https://handlebarsjs.com/guide/builtin-helpers.html), which can be used within [Mustache expressions](https://handlebarsjs.com/guide/expressions) to modify the converter output. The `capFirst` and `noRefs` helpers are used inside the eSSIF-Lab converter template mentioned in the [example](#converter) section above. The `ifValue` helper is used inside the Custom converter template [example](#converter). The input to a helper function is always the evaluated value of the expression that follows the call, possibly with extra options.

```hbs title="Mustache expression format"
// highlight-next-line
 {{<helper> <element> <argument>="<value>"}}
 {{capFirst term}}
 {{noRefs glossaryText type="markdown"}}
```


#### `capFirst`
This simple helper with identifier `capFirst` replaces every word's first character with the capitalized equivalent. Words are obtained by splitting the input on space characters.<br/>
*It takes the input, splits the input at spaces, and capitalizes the first character of every split item, after which the output is returned*

#### `noRefs`
This helper with identifier `noRefs` attempts to use the configured syntax-`type` to convert all links it finds to the `showtext` term property value. It also capitalizes the `showtext` replacement using the `capFirst` helper.<br/>
*It takes the input, finds matches using the configured syntax-`type` and uses the capitalized `showtext` property as a replacement, after which the output is returned.*

Three standard values are available to be used as the value for the `type` option. Multiple values may be provided, in which case the values are interpreted in order from left to right. If no value is provided, '`interpreter`' is used as the default `type`. If a `type` is provided that does not match any of the standard `type` values, we assume the value is meant to be a custom regex.

**Available type values**
- '`interpreter`' uses the regex of the configured [interpreter](#interpreter) to find matches.
- '`html`' uses the regex `<a\b[^>]*?>(?<showtext>.*?)<\/a>` to find HTML `<a>` tags and uses the value in between the opening and closing tag as `showtext`.
- '`markdown`' uses the regex `\[(?<showtext>[^\]]+)\]\((?:[^)]+)\)` to find Markdown hyperlinks and uses the link text as `showtext`.
- '`custom`' a value for `type` that does not match any of the standard `type` values is assumed to be a custom regex.

```hbs title="NoRefs example"
 {{noRefs glossaryText}}
 {{noRefs glossaryText type="markdown"}}
 {{noRefs glossaryText type="markdown, html, interpreter"}}
 {{noRefs glossaryText type="/\[(?<showtext>[^\]]+)\]\((?:[^)]+)\)/, html"}}
```

#### `ifValue`
This helper with identifier `ifValue` allows for equality checking by comparing the first value with the value specified as the `equals` argument. Pay attention to the use of a `#`-character in front of the opening helper tag (`#ifValue`) and a `/`-character at the closing (`/ifValue`) tag in the example.<br/>
 *It compares the input given as the value trailing the opening helper identifier (`ifValue`) and the value of the `equals` option, and shows the value inbetween the opening and closing helper tag if they have the same value.*

```hbs title="ifValue example"
 {{#ifValue termType equals="concept"}}Artifact is a concept{{/ifValue}}
 {{#ifValue termType equals="image"}}Artifact is an image{{/ifValue}}
```

#### `localize`
This helper with identifier `localize` attempts to interpret the value it was given as a URL and compares it to the `website` value within the [SAF](@). If both the `host` values (e.g., tno-terminology-design.github.io) match, the `pathname` of the URL is returned. If the given value cannot be interpreted as a URL, or the `host` values do not match, the input value is returned. This can be useful in situations where external links (URL's pointing to a website other than the current `host`) are handled differently from internal links.

```hbs title="localize example"
 {{localize navurl}}
 <!-- using the localize helper, converts -->
 https://tno-terminology-design.github.io/tev2-specifications/docs/terms/author
 <!-- into -->
 /tev2-specifications/docs/terms/author
 <!-- assuming that the `host` value of the URL matches the SAF website's `host` value -->
```

