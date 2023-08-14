---
# Docusaurus header
id: interpreter
# TEv2 Curated Text Header
term: interpreter
termType: concept
isa:
glossaryTerm: Interpreter
glossaryText: "a software component that reads a (source) text of a specific format, such as a wiki-page or JSON file, and produces a set of [moustache variables](@) based on a predefined profile. These [variables](moustache-variables@) represent extracted data or metadata from the source text."
hoverText: "Interpreter: {(noRef {glossaryText})}"
synonymOf:
grouptags:
formPhrases: interpreter{ss}
# Curation status
status: proposed
created: 2023-07-31
updated: 2023-07-31
# Origins/Acknowledgements
contributors: RieksJ
attribution: "[TNO Terminology Design](https://tno-terminology-design.github.io/tev2-specifications/docs)"
originalLicense: "[CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/?ref=chooser-v1)"
---

# Interpreter

An **interpreter** is a software component that reads a (source) text of a specific format, such as a wiki-page or JSON file, and produces a set of [moustache variables](@) based on a predefined profile. These [variables](moustache-variables@) represent extracted data or metadata from the source text.

Interpreters are used, e.g., by the [TRRT](@) to find [TermRefs](@) in raw texts, and create a set of [moustache variables](@) from their [specified syntax](/docs/spec-syntax/term-ref-syntax) (or the [alternative syntax](/docs/spec-syntax/term-ref-syntax#alternative-syntax))