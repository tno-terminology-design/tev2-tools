---
# Docusaurus header
id: hrg-entry
# TEv2 Curated Text Header
term: hrg-entry
termType: concept
isa: glossary-entry
glossaryTerm: HRG Entry
glossaryText: "A specific kind of (human-readable) rendering of the combination of a [term](@) and a means that helps [readers](@) to understand the meaning of that [term](@) when it is used in a sentence."
hoverText: "HRG Entry: {(noRef {glossaryText})}"
synonymOf: 
grouptags: glossary-entries, reference-materials
formPhrases: hrg-entr{yies}
# Curation status
status: proposed
created: 2023-07-31
updated: 2023-07-31
# Origins/Acknowledgements
contributors: RieksJ
attribution: "[TNO Terminology Design](https://tno-terminology-design.github.io/tev2-specifications/docs)"
originalLicense: "[CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/?ref=chooser-v1)"
---

# HRG Entry

An **HRG Entry** is a specific kind of (human-readable) rendering of the combination of a [term](@) and a means that helps readers to understand the meaning of that [term](@) when it is used in a sentence.

The way in which a [term](@) is rendered depends on how the [HRGT](@) is called. Specifically, a [term](@) that is defined as a `synonymOf` another [term](@) may be rendered in a way that differs from the way in which [terms](@) are rendered that are not a `synonymOf` some other [term](@). Details are provided in the [HRGT specs](/docs/spec-tools/hrgt).

The [terminology pattern](pattern-terminology@) provides an overview of how this concept fits in with related concepts.

The [HRGT specs](/docs/spec-tools/hrgt) document how [HRG entries](@) are selected (and manipulated) for the construction of a particular [HRG](@). They also document how [terms](@) are rendered that are, and those that are not [synonyms](@) of some other [term](@) (there may be differences between them).

### Purpose

[HRG entries](@) provide a specific kind of(human-readable) rendering for the combination of a [term](@) and a means that helps [readers](@) to understand the meaning of that [term](@) when it is used in a sentence, thus facilitating the [reader's](@) understanding of the [term](@) in the way that the [author](@) intended.

As an example, consider a [terms-community](@) that would like to have an overview of all [terms](@) that it uses in a human readable way, and decides it needs a ([human readable](hrg@)) [glossary](@) of these [terms](@). Thus, they need a [tool](hrgt@) that knows how to find all these [terms](@) and their [definitions](@), and (after sorting them) render them into some human readable form. This [tool](hrgt@) would look for the [MRG](@) for that [terminology](@), which contains the [MRG entries](@) that contain all data that  the [tool](hrgt@) needs.

As the number of tools that need (meta) data about [terms](@) grows, [MRG entries](@) will be expected to cater for such needs.
