---
# Docusaurus header
id: body
# TEv2 Curated Text Header
term: body
termType: concept
isa:
glossaryTerm: Body (of a Curated Text)
glossaryText: "the part of a [curated text](@) that comes after its [header](@), i.e. behind the so-called 'front-matter'."
hoverText: "Body (of a Curated Text) the part of a curated text that comes after its its header (also called the 'front-matter')."
synonymOf:
grouptags:
formPhrases: bod{yies}
# Curation status
status: proposed
created: 2023-07-23
updated: 2023-07-23
# Origins/Acknowledgements
contributors: RieksJ
attribution: "[TNO Terminology Design](https://tno-terminology-design.github.io/tev2-specifications/docs)"
originalLicense: "[CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/?ref=chooser-v1)"
---

# Body

:::caution
The entire section on Terminology Engine v 2 (TEv2) is still under construction.<br/>
As TEv2 is not (yet) available, the texts that specify the tool are still 'raw', i.e. not yet processed.<br/>[readers](@) will need to see through some (currently unprocessed) notational conventions.
:::

### Summary

Every [curated text](@) consists of two parts. The first part starts with a line containing `---`, and ends with a similar line. This part is called the [header (of the curated text)](header@). The second part is what comes after the [header](@), and that is the [body (of the curated text)](body@). 

<details>
  <summary>Example</summary>
  <div>

~~~ yaml
---
# here is where the header-stuff of the curated text goes.
# the body of the curated text starts below the next line.
---

# Curated Text
A curated text starts with three dashes `---`.
This indicates the start of its (YAML) header.
Typically, the header consists of a sequence of key-value pairs.
The header is terminated with onother three dashes and a new line.

The body of the curated text starts behind the header block.
It is typically markdown, but other constructs may be inserted
that contribute to the rendering of these texts in a (static) website.
An example of this is [MDX](https://mdxjs.com/).
A discussion on these other constructs is outside the scope of this document.
~~~

  </div>
</details>
