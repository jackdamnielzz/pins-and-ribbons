# Map: 1944 terrain, crossings and routes

Facts used by `tools/mapgen` to make the map of "The Island" look like September 1944 rather than today. Every fact has a source link; `TODO(history)` marks what is still missing. Locations of zones and crossings come from markers on the sites (Liberation Route, airborne memorials) or from the named OpenStreetMap feature that a source identifies.

## Crossings

State is at the start of the scenario, 17 September 1944, 13:00 (British time).

| Crossing | State at start | What happened | Source |
| --- | --- | --- | --- |
| Arnhem road bridge | Intact | Only a few bridge keepers at the north end; Frost's force reached the north end around 20:00 on 17 Sep. The bridge marker stands at 51.97585 N, 5.91242 E | [zones.md][bridgeguard], [Liberation Route 692][lr692] |
| Arnhem rail bridge (Oosterbeek) | Intact | Blown at about 18:00 on 17 Sep as a platoon of C Company, 2nd Parachute Battalion ran onto it | [battle-of-arnhem.com][railbridge] |
| Arnhem pontoon bridge | Damaged (not crossable) | A pontoon bridge stood at the Boterdijk, on the site of an older ship bridge; it had been the crossing while the road bridge (blown in May 1940) was repaired. The Germans had removed its middle section and moored it at the south bank; B Company, 2nd Parachute Battalion found it so after 02:00 on 18 Sep. Marker at 51.980641 N, 5.899402 E | [Liberation Route 703][lr703], [Battle of Arnhem][wiki-arnhem] |
| Heveadorp–Driel ferry | Intact | Disabled by the ferryman on 20 Sep. Marker at 51.971725 N, 5.825190 E | [Liberation Route 657][lr657] |
| Nijmegen road bridge (Waalbrug, 1936) | Intact | Stayed in German hands; the demolition control was in the main post office. Taken intact on 20 Sep about 19:10. Marker at 51.848882 N, 5.868223 E | [US Army CMH, ch. 7][cmh7], [Liberation Route 463][lr463], [Liberation Route 133][lr133] |
| Nijmegen rail bridge | Intact | No attempt was made on it on 17 Sep; captured two hours after the Waal crossing on 20 Sep | [US Army CMH, ch. 7][cmh7], [Liberation Route 133][lr133] |
| Grave bridge over the Maas (today's John S. Thompson Bridge) | Intact | Taken intact by the 504th PIR within three hours on 17 Sep; it was to be blown only on the corps commander's order. Marker at 51.76874 N, 5.73109 E | [US Army CMH, ch. 7][cmh7], [Liberation Route 554][lr554] |
| Heumen lock bridge over the Maas–Waal canal | Intact | Prepared for demolition but taken intact on 17 Sep; became the main route over the canal for the British ground column. Marker "Bridge number 7" at 51.767615 N, 5.850428 E | [US Army CMH, ch. 7][cmh7], [Liberation Route 482][lr482], [Europe Remembers][er584] |
| Malden bridge over the canal | Intact | Blown as the attackers made their final dash on 17 Sep | [US Army CMH, ch. 7][cmh7], [Europe Remembers][er584] |
| Hatert bridge over the canal | Intact | Attacked on 17 Sep and found demolished | [US Army CMH, ch. 7][cmh7], [Europe Remembers][er584] |
| Honinghutje bridge over the canal | Intact | On the main Grave–Nijmegen highway; German demolitions damaged but did not destroy it; the column went by the Heumen bridge instead | [US Army CMH, ch. 7][cmh7], [Europe Remembers][er584] |
| Mook rail bridge over the Maas | Intact | Blown by the Germans as American patrols tried to seize it on 17 Sep | [US Army CMH, ch. 7][cmh7] |
| Pannerden ferry over the Pannerdensch Kanaal | Not yet in service | Set up by the 10th SS on 18 Sep because the Arnhem bridge was blocked; the division's ferry service across the Pannerdens Canal moved it to Nijmegen | [marketgarden.com][mg8], [WarHistory.org][wh10ss] |

The four Maas–Waal canal bridges that were Market Garden targets were Heumen, Malden, Hatert and Honinghutje ([Europe Remembers][er584]). Today's canal bridges carry these roads: Heumen lock complex on the Jan J. Ludenlaan, Maldensebrug on the Blankenbergseweg, Hatertsebrug on the Hatertseweg (rebuilt in the 1960s), Graafsebrug on the Graafseweg (Nijmegen–Wijchen) ([Maas-Waalkanaal, Wikipedia NL][wiki-mwk]). The Graafsebrug is taken as the Honinghutje bridge because the CMH places that bridge on the main Grave–Nijmegen highway.

Not on the map for lack of a 1944 source:

- Westervoort IJssel bridges. A combined rail and road bridge opened there on 5 April 1901 ([Bruggen 2023 nr. 4][bruggen]) and the Dutch army blew the bridges on 10 May 1940 ([Nationaal Onderduikmuseum][nom]), but no source found gives their state in September 1944. TODO(history).
- Canal bridges at Weurt, Neerbosch and Dukenburg (road and rail). Not named in any source found for 1944. TODO(history).

## Removed post-war features

| Feature | Built | Source |
| --- | --- | --- |
| A12 near Arnhem | Planken Wambuis – Arnhem noord 1957; Arnhem noord – Velperbroek and Velperbroek – Zevenaar 1961 | [Rijksweg 12, Wikipedia NL][wiki-a12] |
| A50 | First section (Waterberg – Grijsoord) opened 29 May 1957; the rest later | [Rijksweg 50, Wikipedia NL][wiki-a50] |
| A325 Nijmegen – Arnhem | Former Rijksweg 52; work on it had already begun during the Second World War. TODO(history): whether any of it was usable in September 1944 | [Provinciale weg 325, Wikipedia NL][wiki-n325] |
| A15 at Ressen | Knooppunt Ressen opened 1980. TODO(history): the A15 west of Ressen | [Knooppunt Ressen, Wikipedia NL][wiki-ressen] |
| A73 | Main sections from 1986. TODO(history): the short section west of Nijmegen | [Rijksweg 73, Wikipedia NL][wiki-a73] |
| A326 | Opened 12 June 1975 | [Provinciale weg 326, Wikipedia NL][wiki-a326] |
| A348 | TODO(history): no opening year found | – |
| Nelson Mandelabrug, Arnhem | Opened 18 December 1977 as the Roermondspleinbrug | [Nelson Mandelabrug (Arnhem), Wikipedia NL][wiki-nmb] |
| Andrej Sacharovbrug, Arnhem | Opened 3 November 1987 | [Andrej Sacharovbrug, Wikipedia NL][wiki-asb] |
| De Oversteek, Nijmegen | Opened November 2013 | [De Oversteek, Wikipedia NL][wiki-oversteek], [Liberation Route 1343][lr1343] |
| Betuweroute | Opened 16 June 2007 | [Betuweroute, Wikipedia NL][wiki-betuwe] |
| Spiegelwaal, Nijmegen | Dug 2013–2015, opened 3 December 2015 | [Spiegelwaal, Wikipedia NL][wiki-spiegel] |

## Built-up area

- 1944 built-up area comes from BAG building footprints with a construction year of 1944 or earlier ([BAG via PDOK][bag]). Buildings destroyed in or after the war are missing from BAG, so towns damaged in 1944 are under-counted.
- **Arnhem:** the centre (bounded by the singels, the John Frostbrug, the Nelson Mandelabrug and the Rhine) was badly damaged in the Battle of Arnhem in 1944 and rebuilt after 1945 ([Binnenstad (Arnhem), Wikipedia NL][wiki-binnenstad]). The inhabitants were evacuated from 24 Sep ([Slag om Arnhem, Wikipedia NL][wiki-slag]).
- **Nijmegen:** the bombing of 22 February 1944 destroyed a large part of the historic centre, about 1,300 properties, mostly in the Bovenstad; the Benedenstad was hit less ([Bombardement op Nijmegen (22 februari 1944), Wikipedia NL][wiki-bomb]). The Bovenstad and Benedenstad together form the inner city ([Stadscentrum (Nijmegen), Wikipedia NL][wiki-stadscentrum]).
- The core outlines are the CBS districts and neighbourhoods for those areas ([CBS Wijk- en Buurtkaart via PDOK][cbs]).
- TODO(history): no 1944 source for built-up area on the German side (Wyler, Kranenburg, Zyfflich).

## Heath

- **Renkum Heath (DZ X, LZ X, LZ Z):** paratroopers and gliders of 1st Airborne Division landed in the fields around the Renkum Heath Memorial, which stands on the edge of drop zone X (51.987189 N, 5.743567 E) ([Stichting Airborne Herdenkingen][rhm]); landings on 17 Sep at Renkum, marker at 51.988455 N, 5.745893 E ([Liberation Route 467][lr467]). LZ Z lies west of Wolfheze ([Battle of Arnhem, Wikipedia][wiki-arnhem]).
- **Ginkel Heath (DZ Y):** heath near Ede where the 4th Parachute Brigade landed on 18 Sep ([Ginkelse Heide, Wikipedia NL][wiki-ginkel]; [Liberation Route 705][lr705], [501][lr501], [706][lr706]).
- HGN 1900 and 1960 (WUR, CC-BY) are only handed out through a request form ([lgn.nl][lgn]). Decision 0007: HGN is not used in version 1.0; woodland comes from today's OpenStreetMap.

## Landing and drop zones (locations)

| Zone | Location | Source |
| --- | --- | --- |
| DZ X | Edge of the zone at the Renkum Heath Memorial | [Stichting Airborne Herdenkingen][rhm] |
| LZ X | Renkum landing area, marker 467 | [Liberation Route 467][lr467] |
| LZ Z | West of Wolfheze, on Renkum Heath | [Battle of Arnhem, Wikipedia][wiki-arnhem] |
| DZ Y | Ginkel Heath, marker 705 | [Liberation Route 705][lr705] |
| DZ O | Meadows north of Overasselt and Nederasselt, marker at 51.768510 N, 5.770290 E | [Liberation Route 450][lr450] |
| DZ N | South of Groesbeek, marker at 51.758296 N, 5.920805 E | [Liberation Route 457][lr457] |
| LZ L | Just north of the Wolfheze–Oosterbeek railway at the Johannahoeve; the Papendal sports centre covers its western part. Marker at 52.004377 N, 5.829859 E | [Liberation Route 2189][lr2189] |
| Polish DZ (Driel) | East of Driel; about 1,000 Poles landed around 17:00 on 21 Sep | [battle-of-arnhem.com][polishdrop], [Paradata][paradata-polish] |
| DZ T | An oval 3,000 yards east–west south of Wyler, on both sides of the Groesbeek–Wyler road, with a railway on its south side | [WarHistory.org][whn2m] |
| Supply dropping point V | In German hands throughout; never reached by the British. TODO(history): no source found that places it | [Battle of Arnhem, Wikipedia][wiki-arnhem] |

## Roads

- The road network is today's OpenStreetMap network without the post-war motorways listed above. Roads built after 1944 in other places (for example through Arnhem-Zuid, Nijmegen-Dukenburg and Lindenholt) are still drawn. TODO(history): a dated 1944 source for the road network, such as the 1944 topographic map sheets, to remove post-war roads.

## Club Route

XXX Corps was to advance through Valkenswaard, Eindhoven, Son, Veghel, Grave, Nijmegen, Elst and finally Arnhem ([Back to Normandy][btn]). Between Grave and Nijmegen the column crossed the Maas–Waal canal by the Heumen bridge, because the Honinghutje bridge was damaged ([US Army CMH, ch. 7][cmh7]). TODO(history): the exact roads between those places.

[bridgeguard]: https://battle-of-arnhem.com/?p=987
[railbridge]: https://www.battle-of-arnhem.com/john-frosts-battalion-captures-the-rhine-bridge-but-not-the-railway-bridge-and-the-ship-bridge/
[wiki-arnhem]: https://en.wikipedia.org/wiki/Battle_of_Arnhem
[cmh7]: https://www.ibiblio.org/hyperwar/USA/USA-E-Siegfried/USA-E-Siegfried-7.html
[lr692]: https://www.liberationroute.com/pois/692/de-verkeersbrug-bij-arnhem
[lr703]: https://www.liberationroute.com/pois/703/boterdijk
[lr657]: https://www.liberationroute.com/pois/657/the-driel-ferry-disabled-for-the-germans-and-unusable-for-the-poles
[lr463]: https://www.liberationroute.com/pois/463/german-frogmen-beleaguer-the-bridges
[lr133]: https://www.liberationroute.com/en/pois/133/waal-crossing
[lr554]: https://www.liberationroute.com/en/pois/554/the-john-s-thompson-bridge
[lr482]: https://www.liberationroute.com/pois/482/bridge-number-7
[lr1343]: https://www.liberationroute.com/en/pois/1343/road-blocks
[lr467]: https://www.europeremembers.com/pois/467/the-landing-of-parachutists-and-gliders
[lr705]: https://www.europeremembers.com/pois/705/airborne-landings-on-the-ginkel-heath
[lr501]: https://www.europeremembers.com/pois/501/battle-of-ginkelse-heide
[lr706]: https://www.europeremembers.com/pois/706/labor-camp-t-wijde-veld
[lr450]: https://www.liberationroute.com/en/pois/450/freedom-falls-from-the-skies
[lr457]: https://www.liberationroute.com/en/pois/457/liberators-like-stars-from-the-skies
[er584]: https://www.europeremembers.com/events/584/onthulling-plaquette-sluisbrug-heumen
[wiki-mwk]: https://nl.wikipedia.org/wiki/Maas-Waalkanaal
[mg8]: https://legacy.marketgarden.com/2010/UK/statistics/statis8
[wh10ss]: https://warhistory.org/%40msw/article/10th-ss-panzer-division-at-the-arnhem-battles-i
[whn2m]: https://warhistory.org/zh/article/from-neptune-to-market-ii?amp=1
[bruggen]: https://www.bruggenstichting.nl/images/bruggen2023/december_2023/westervoort.pdf
[nom]: https://nationaalonderduikmuseum.nl/en/see-and-do/freedom-programme/quartet/westervoort/
[wiki-a12]: https://nl.wikipedia.org/wiki/Rijksweg_12
[wiki-a50]: https://nl.wikipedia.org/wiki/Rijksweg_50
[wiki-n325]: https://nl.wikipedia.org/wiki/Provinciale_weg_325
[wiki-ressen]: https://nl.wikipedia.org/wiki/Knooppunt_Ressen
[wiki-a73]: https://nl.wikipedia.org/wiki/Rijksweg_73
[wiki-a326]: https://nl.wikipedia.org/wiki/Provinciale_weg_326
[wiki-nmb]: https://nl.wikipedia.org/wiki/Nelson_Mandelabrug_(Arnhem)
[wiki-asb]: https://nl.wikipedia.org/wiki/Andrej_Sacharovbrug
[wiki-oversteek]: https://nl.wikipedia.org/wiki/De_Oversteek_(brug)
[wiki-betuwe]: https://nl.wikipedia.org/wiki/Betuweroute
[wiki-spiegel]: https://nl.wikipedia.org/wiki/Spiegelwaal
[bag]: https://service.pdok.nl/lv/bag/wfs/v2_0
[cbs]: https://service.pdok.nl/cbs/wijkenbuurten/2023/wfs/v1_0
[wiki-binnenstad]: https://nl.wikipedia.org/wiki/Binnenstad_(Arnhem)
[wiki-slag]: https://nl.wikipedia.org/wiki/Slag_om_Arnhem
[wiki-bomb]: https://nl.wikipedia.org/wiki/Bombardement_op_Nijmegen_(22_februari_1944)
[wiki-stadscentrum]: https://nl.wikipedia.org/wiki/Stadscentrum_(Nijmegen)
[rhm]: https://www.airborne-herdenkingen.nl/en/?p=18153
[wiki-ginkel]: https://nl.wikipedia.org/wiki/Ginkelse_Heide
[lgn]: https://lgn.nl/bestanden
[btn]: https://www.backtonormandy.org/the-history/divisions-armored/guards-armoured-division-uk/153-field-regiment-ra/13628-153rd-field-regiment-royal-artillery-at-nijmegen/visit.html?cf_id=33
[lr2189]: https://liberationroute.com/pois/2189/landing-in-hell
[polishdrop]: https://www.battle-of-arnhem.com/the-airborne-landing-of-the-polish-brigade-near-driel/
[paradata-polish]: https://paradata.org.uk/content/4634452
