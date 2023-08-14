---
# Docusaurus header
id: converter
# TEv2 Curated Text Header
term: converter
termType: concept
isa:
glossaryTerm: Converter
glossaryText: "a software component that takes the output of an [interpreter](@), i.e., the set of moustache variables it has produced, and processes these, possibly with other data from e.g. a [MRG](@), to generate a new, converted text in a different format. The converter uses the values assigned to the moustache variables to produce the transformed output."
hoverText: "Converter: {(noRef {glossaryText})}"
synonymOf: text-converter
grouptags: 
formPhrases: converter{ss}
# Curation status
status: proposed
created: 2023-07-31
updated: 2023-07-31
# Origins/Acknowledgements
contributors: RieksJ
attribution: "[TNO Terminology Design](https://tno-terminology-design.github.io/tev2-specifications/docs)"
originalLicense: "[CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/?ref=chooser-v1)"
---

# Converter

A **converter** is a software component that takes the output of an [interpreter](@), i.e., the set of moustache variables it has produced, and processes these, possibly with other data from e.g. a [MRG](@), to generate a new, converted text in a different format. The converter uses the values assigned to the moustache variables to produce the transformed output.

Converters are used, e.g., by the [TRRT](@) to create [renderable refs](@) from the [moustache variables](@) produced by [TermRefs](@).