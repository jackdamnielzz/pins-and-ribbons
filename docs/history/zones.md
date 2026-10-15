# Zones, bridges and map area

Drop zones, landing zones, bridges and crossings for "The Island" scenario. Taken from PLAN.md sections 5 and 14. Sourced locations and the September 1944 state of every crossing on the map are in [map.md](map.md).

Facts marked `TODO(history)` have no per-fact source link in the plan yet. Add one before relying on the fact.

## Map area

The vertical slice covers about 25 × 35 km (decision 0005), from Heelsum in the west to Pannerden in the east, and from north of Arnhem to Groesbeek and Overasselt in the south (PLAN §5). Exact hexes are set in `data/scenarios/the-island.json`.

## Drop and landing zones

Zones S, Z, X, Y, L, V, O, N and T are confirmed (PLAN §14.2).

| Zone | Location | Used by (historical) | Source |
| --- | --- | --- | --- |
| LZ S | North of Wolfheze | 1st Airlanding Brigade HQ, 7 KOSB, first half of 2 S Staffords, 1 Border (17 Sep) | [1st Airlanding Bde report][airlanding] |
| LZ Z | Renkum Heath | Division HQ, Reconnaissance Squadron, Light Regiment RA, Anti-Tank Battery, 9th Field Company RE, 1st Parachute Brigade gliders (17 Sep) | Location: [map.md](map.md); units: PLAN §5.2, TODO(history) |
| DZ X | Renkum Heath | 1st Parachute Brigade parachutists and 1st Parachute Squadron RE (17 Sep) | Location: [map.md](map.md); units: PLAN §5.2, TODO(history) |
| DZ Y | Ginkel Heath, west edge | 4th Parachute Brigade (18 Sep) | [map.md](map.md) (Ginkel Heath, 4th Parachute Brigade, 18 Sep); west edge: TODO(history) |
| LZ X | Next to DZ X | Second-lift gliders, including the rest of 2 S Staffords (18 Sep) | [1st Airlanding Bde report][airlanding] |
| LZ L | Johannahoeve, north of the Wolfheze–Oosterbeek railway | Polish anti-tank battery gliders (19 Sep) | [Liberation Route 2189][lzl] |
| Supply dropping point V | North-west Arnhem | Planned resupply zone; in German hands from 19 Sep | PLAN §5.2, TODO(history) |
| DZ K | South end of the Arnhem road bridge | Planned Polish drop; never used, because the area was in German hands | PLAN §5.2, TODO(history) |
| Polish DZ (Driel) | Polder east of Driel | Actual Polish drop on 21 Sep around 17:00, about 1,000 men (after the slice ends). Some sources call this zone DZ K too | [battle-of-arnhem.com][polishdrop], [Paradata][paradata-polish] |
| DZ O | Overasselt | 504th PIR; E Company on a separate zone next to the Grave bridge | [map.md](map.md) (504th north of Overasselt; E Company landed far from its goal) |
| DZ N | South of Groesbeek | 505th PIR, 82nd Division HQ, 376th Parachute Field Artillery Bn; gliders on 18 Sep | Location: [map.md](map.md); units: PLAN §5.2, TODO(history) |
| DZ T | South of Wyler, north-east of Groesbeek | 508th PIR; gliders on 18 Sep | [map.md](map.md) (508th on both sides of the Groesbeek–Wyler road; retaken 18 Sep about 14:00 before the gliders) |

DZ K and the Polish DZ at Driel are kept apart in the game: DZ K is the zone the plan named, and "Polish DZ (Driel)" is where the brigade actually dropped. Paradata and TracesOfWar use the name DZ K for the Driel zone.

## Bridges and crossings

"Start owner" and "VP per hour" are scenario design (PLAN §5.1); "Historical state" is the fact.

| Objective | Start owner | VP per hour | Historical state | Source |
| --- | --- | --- | --- | --- |
| Arnhem Road Bridge | German | 3 | Intact; only a few bridge keepers in a bunker at the north end | [battle-of-arnhem.com][bridgeguard] |
| Arnhem Rail Bridge (Oosterbeek) | German | 0 | Blown at about 18:00 on 17 Sep as a platoon of C Company, 2nd Parachute Battalion ran onto it (scripted) | [battle-of-arnhem.com][railbridge] |
| Arnhem pontoon bridge | – | 0 | Centre section removed by the Germans and moored at the south bank; not crossable | [map.md](map.md) (Liberation Route, Boterdijk) |
| Nijmegen Road Bridge | German | 2 | Intact and prepared for demolition; Model withheld permission to blow it | [US Army CMH, ch. 8][cmh8] |
| Nijmegen Rail Bridge | German | 1 | Intact and prepared for demolition | PLAN §5.1, TODO(history) |
| Heveadorp–Driel ferry | Neutral | 0 | Disabled by the ferryman on 20 Sep; gone when the Poles arrived | [Liberation Route][ferry] |

Game rules tied to these crossings (PLAN §5.1, §5.5): the Heveadorp ferry is usable by infantry, one unit per hour, until 20 Sep; Nijmegen road bridge demolition is authorised from 20 Sep evening.

## Other places named in the plan

- **Joe's Bridge:** XXX Corps start line on 17 Sep. Source: PLAN §14.2 (confirmed), TODO(history).
- **Pannerden ferry:** set up by the 10th SS on 18 Sep and used to reach Nijmegen. Source: [map.md](map.md).
- **Nijmegen:** Kronenburgerpark, the rail bridge, Hunner Park and the Valkhof (German positions). Source: PLAN §5.4, TODO(history).
- **Arnhem and Oosterbeek:** Den Brink, Dreyenseweg, Utrechtseweg, Amsterdamseweg, Oosterbeek station, Arnhem railway yard. Source: PLAN §5.4, TODO(history).
- **Reichswald, Wyler, Beek, Groesbeek, Mook:** German attacks on the 82nd Airborne sector. Source: [Warfare History Network][groesbeek].
- **Lent, Oosterhout, Elst, Zevenaar:** German positions north of the Waal. Source: PLAN §5.4, TODO(history); Elst and Zevenaar: [506th Heavy Panzer Battalion][spz506].

[airlanding]: https://vriendenairbornemuseum.nl/public/1Airborne_Division_Report_on_Operation_Market_partIV_annexO2_1AirLBdeOCR.pdf
[bridgeguard]: https://battle-of-arnhem.com/?p=987
[railbridge]: https://www.battle-of-arnhem.com/john-frosts-battalion-captures-the-rhine-bridge-but-not-the-railway-bridge-and-the-ship-bridge/
[cmh8]: https://www.ibiblio.org/hyperwar/USA/USA-E-Siegfried/USA-E-Siegfried-8.html
[ferry]: https://france.liberationroute.com/pois/657/the-driel-ferry-disabled-for-the-germans-and-unusable-for-the-poles
[groesbeek]: https://warfarehistorynetwork.com/article/u-s-82nd-airborne-division-mook-holland-operation-market-garde/
[spz506]: https://en.wikipedia.org/wiki/506th_Heavy_Panzer_Battalion
[polishdrop]: https://www.battle-of-arnhem.com/the-airborne-landing-of-the-polish-brigade-near-driel/
[paradata-polish]: https://paradata.org.uk/content/4634452
[lzl]: https://liberationroute.com/pois/2189/landing-in-hell
