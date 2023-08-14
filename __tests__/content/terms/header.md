---
# Docusaurus header
id: header
# TEv2 Curated Text Header
term: header
termType: concept
isa:
glossaryTerm: "Header (of a Curated Text)"
glossaryText: "the part of a [curated text](@), which is at the beginning of that text, that starts with a line that (only) contains three subsequent '-'characters, and that ends with a second occurrance of such a line."
hoverText: "Header (of a Curated Text): the part at the beginning of that curated text, that starts with a line that (only) contains three subsequent '-'characters, and that ends with a second occurrance of such a line."
synonymOf:
grouptags:
formPhrases: header{ss}
# Curation status
status: proposed
created: 2023-07-23
updated: 2023-07-23
# Origins/Acknowledgements
contributors: RieksJ
attribution: "[TNO Terminology Design](https://tno-terminology-design.github.io/tev2-specifications/docs)"
originalLicense: "[CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/?ref=chooser-v1)"
---

# Header

The **Header (of a [Curated Text](@)** is the part at the beginning of that [curated text](@), that starts with a line that (only) contains the text `---`, and that ends with a second occurrance of such a line. The [header](@) is a set of key-value pairs (interleaved with comments) that contain meta data about the [curated text](@) and/or data that could also have been part of the [body](@), but is so small that it doesn't warrant to have a dedicated section for it.

## Example

<details>
  <summary>Example</summary>
  <div>

~~~ yaml
---
# TEv2 Curated Text Header
term: curated-text
termType: concept
isa:
glossaryTerm: Curated Text
glossaryText: a text that documents a [concept](@) or other [knowledge artifact](@) of a specific [community](@) or other [party](@), and is located within a [scope](@) that is owned by that [community](@)/[party](@).
synonymOf:
grouptags:
formPhrases: curated-text{ss}, ctext{ss}
# Curation status
status: proposed
created: 2022-06-02
updated: 2022-08-04
# Origins/Acknowledgements
contributors: RieksJ
attribution: "[eSSIF-Lab](https://essif-lab.github.io/framework)"
originalLicense: "[CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/?ref=chooser-v1)"
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

## Notes

- The header is crucial for categorizing and managing curated texts, enabling efficient retrieval and navigation of relevant information.
- The information within the header ensures consistency and accuracy in the curation process.
