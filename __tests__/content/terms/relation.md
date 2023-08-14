---
# Docusaurus header
id: relation
# TEv2 Curated Text Header
term: relation
termType: concept
isa:
glossaryTerm: Relation (between Concepts)
glossaryText: "a (significant) connection or association between two or more [concepts](@). These connections define the way these [concepts](@) are interrelated, providing insights into how they interact and influence each other."
hoverText: "Relation (between Concepts): {(noRef {glossaryText})}"
synonymOf:
grouptags: conceptual-modeling
formPhrases: relation{ss}
# Curation status
status: proposed
created: 2023-07-31
updated: 2023-07-31
# Origins/Acknowledgements
contributors: RieksJ
attribution: "[TNO Terminology Design](https://tno-terminology-design.github.io/tev2-specifications/docs)"
originalLicense: "[CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/?ref=chooser-v1)"
---

# Relation (between Concepts)

A **relation (between [concepts](@))** is a (significant) connection or association between two or more [concepts](@). These connections define the way these [concepts](@) are interrelated, providing insights into how they interact and influence each other.

Relations can have multiplicity constraints, which specify the possible cardinalities or number of occurrences allowed between the connected concepts. (See [this item on StackOverflow](https://stackoverflow.com/questions/17877582/multiplicity-vs-cardinality#:~:text=Simply%20put%3A%20a%20multiplicity%20is,They%20are%20not%20synonymous.).) They are crucial for accurately representing the structure and behavior of conceptual models.

[Relations](@) are complemented with [Properties](@), that describe characteristics of individual [concepts](@) in terms of data attributes or values.

Properly defining relations enables people to establish a shared understanding of how different concepts within the model relate to one another, supporting effective collaboration and communication among stakeholders.

## Examples

1. In a conceptual model that answers questions about onboarding, keeping, and offboarding people (as employees) in organizations, we have the [concept](@) `Person`, the [concept](@) `Organization`, and a relation `is employee of`, which connects the `Person` concept with the `Organization` concept, where this relation and can be defined, e.g., as "{Person} has successfully completed the onboarding process of the {Organization}, and has not been offboarded".
2. A "Part-Of" relation in a hierarchical taxonomy establishes the subordination of concepts, such as "Car" being a part of the "Vehicle" concept.
3. Other examples are given on the page [notations and conventions](/docs/notations-and-conventions#pattern-diagram-notations).

## Notes

- Relations play a fundamental role in expressing the interdependence and dependencies between concepts in a conceptual model.
- Understanding and defining relations are essential for ensuring a consistent and comprehensive representation of the domain.
