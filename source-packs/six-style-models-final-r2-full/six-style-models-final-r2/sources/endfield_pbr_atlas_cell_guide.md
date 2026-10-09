# Endfield PBR atlas cell index guide
Orientation: row 1 is the TOP of the image; column 1 is the LEFT. Public indices are 1-based row-major; zero-based index is public index minus 1. This atlas intentionally has different UV semantics from the approved oil / cel palette.
UV sample center for zero-based column c and top-origin row r: u=(c+0.5)/8; v=1-(r+0.5)/8. Keep UV islands comfortably inside each cell and retain at least 3 pixels inset at 1024 runtime resolution.
Do not interpret the natural variations as normals or gloss. This is sRGB basecolor/albedo only; use separate shader roughness, metalness and geometry lighting. Metals here need appropriate metalness in the material. No baked lighting is intended.

| Row | Indices left to right | Materials left to right |
|---|---|---|
| 1 | 1,2,3,4,5,6,7,8 | Dark walnut endgrain; dark weathered walnut longgrain; deep mahogany; medium aged oak; honey oak; pale ash; golden maple; gray driftwood |
| 2 | 9,10,11,12,13,14,15,16 | Sienna timber; espresso fine woodgrain; chestnut with knots; sandy oak; amber pine; pale birch; faded blue-gray stained wood; brown endgrain |
| 3 | 17,18,19,20,21,22,23,24 | Charcoal coated metal; dark brushed steel; galvanized gray steel; cool brushed aluminum; ivory powder coat; stone-gray industrial paint; steel-blue enamel; charcoal with small muted yellow stripe |
| 4 | 25,26,27,28,29,30,31,32 | Graphite scratched coat; warm gunmetal; gray worn industrial paint; slate-blue brushed metal; aged ivory steel; light cool dusty gray steel; chipped steel-blue paint; dark gray with two small muted yellow dashes |
| 5 | 33,34,35,36,37,38,39,40 | Cream cotton; faded teal cotton; ochre canvas; coral canvas; navy canvas; dark brown leather; cognac leather; burgundy leather |
| 6 | 41,42,43,44,45,46,47,48 | Warm gray stone; blue-gray slate; sandy limestone; ivory lime plaster; pale cream ceramic; muted teal ceramic; terracotta; gray-beige plaster |
| 7 | 49,50,51,52,53,54,55,56 | Forest leaf; olive leaf; mid-green leaf; pale sage leaf; toasted bread crust; amber pastry flakes; light-golden pastry crust; cream bread crumb |
| 8 | 57,58,59,60,61,62,63,64 | Deep cool leaf; yellow-green young leaf; teal-green leaf; buttery cream dough; dark patinated copper; warm reddish copper; aged dark brass; muted ochre brass |

Recommended semantic choices for prop production:
- Wood counters/beams: 1–16
- Dark support frames/panels: 17,18,25,26; pale or blue metal accents: 21,22,23,29,30,31
- Muted safety marks: 24 or 32 only
- Canopies/aprons: 33–37; leather straps: 38–40
- Planters and pots: 45–47; paving or foundations: 41–44,48
- Foliage: 49–52,57–59; bread display: 53–56,60; metal hardware: 61–64

