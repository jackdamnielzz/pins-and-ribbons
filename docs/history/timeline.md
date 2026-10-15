# Timeline

Scripted and historical events for "The Island" scenario (17 Sep 13:00 to 21 Sep 12:00). Taken from PLAN.md sections 5.5, 5.6 and 14.

`data/scenarios/the-island.json` must match this file; a unit test compares the scenario timeline with this file for drift (PLAN §14.4).

All times are British time (UTC+1); German and Dutch clocks ran one hour ahead. See [terminology.md](terminology.md#time).

Facts marked `TODO(history)` have no per-fact source link in the plan yet. Add one before relying on the fact.

## Scenario timeline (PLAN §5.5)

| Game time (British time) | Event | Source |
| --- | --- | --- |
| 17 Sep 13:00 | First lift lands; scenario starts paused on the briefing | PLAN §5.5, TODO(history) |
| 17 Sep 13:40 | Krafft's battalion reports the landings and starts blocking | PLAN §5.5, TODO(history) |
| 17 Sep 14:30 | XXX Corps attacks from Joe's Bridge (off-map signal) | PLAN §14.2 gives 14:35 (confirmed), TODO(history) |
| 17 Sep 16:30 | Kampfgruppe Möller reaches Den Brink | PLAN §5.5, TODO(history) |
| 17 Sep ~18:00 | Arnhem rail bridge blown; Gräbner's battalion drives south over the road bridge if it is still German | Rail bridge: [battle-of-arnhem.com][railbridge]; Gräbner: TODO(history) |
| 17 Sep night | Weak 508th probe towards the Nijmegen road bridge is possible; Henke holds | PLAN §5.5, TODO(history) |
| 18 Sep 04:00 | Kampfgruppe Knaust arrives at Arnhem | [Weapons and Warfare][knaust] |
| 18 Sep 09:30 | Gräbner attacks north over the Arnhem bridge | PLAN §5.5, TODO(history) |
| 18 Sep morning | Korps Feldt attacks DZ N and Mook from the Reichswald | [Warfare History Network][groesbeek] |
| 18 Sep ~12:00 | 10th SS (Euling, Reinhold) reaches Nijmegen via the Pannerden ferry | PLAN §5.5 and §14.2 (confirmed), TODO(history) |
| 18 Sep ~15:00 | Second lift, about 5 hours late because of fog in England (extra delay possible) | PLAN §5.5, TODO(history) |
| 19 Sep 08:20 | Household Cavalry reaches Grave; Guards Armoured follows into the map | [US Army CMH, ch. 7][cmh7] |
| 19 Sep ~15:00 | Resupply drop on dropping point V (German-held); Polish gliders on LZ L ~16:00; 82nd gets only about half its gliders | PLAN §5.5, TODO(history) |
| 19 Sep 15:15 | Historical first Allied attack on the Nijmegen bridges (AI guidance only) | [US Army CMH, ch. 7][cmh7] |
| 19 Sep night | First Panzer IVs ferried over at Pannerden | PLAN §5.5, TODO(history) |
| 20 Sep morning | II. Fallschirmkorps attacks Groesbeek heights; Mook falls around 14:00 if weakly held | [Warfare History Network][groesbeek] |
| 20 Sep | Heveadorp ferry disabled | [Liberation Route][ferry] |
| 20 Sep 15:00 | Historical 504th Waal crossing (26 canvas boats) available as a boat assault if engineers and boats are present | PLAN §5.6 and §14.2 (confirmed), TODO(history) |
| 20 Sep evening | Nijmegen road bridge demolition is authorised: from now on the normal demolition rule (PLAN §4.9) applies | PLAN §5.5, TODO(history) |
| 21 Sep 05:00 | Historical end of resistance at the Arnhem bridge (debrief comparison only) | PLAN §5.6, TODO(history) |
| 21 Sep 12:00 | Scenario ends; debrief | – (design) |

Some entries mix history and game rules (for example "if it is still German", "if weakly held", "AI guidance only"). The conditions are scenario design; the times are the historical anchors.

## Other dated events (PLAN §5 and §14)

| Time (British time) | Event | Source |
| --- | --- | --- |
| 17 Sep ~13:50 | 1st Parachute Brigade drops on DZ X | PLAN §5.3, TODO(history) |
| 17 Sep 16:30 | Kampfgruppe Möller arrives (Den Brink) | PLAN §5.4, TODO(history) |
| 17 Sep ~17:00 | Kampfgruppe Spindler arrives (Dreyenseweg line) | PLAN §5.4, TODO(history) |
| 17 Sep late evening | Kampfgruppe Brinkmann arrives in east Arnhem; first unit ordered to the Arnhem bridge | [battle-of-arnhem.com][bridgeguard] |
| 17 Sep ~20:00 | About 740 men under Frost reach the north end of the Arnhem road bridge | PLAN §5.6 and §14.2 (confirmed), TODO(history) |
| 18 Sep | KG Spindler splits into KG von Allwörden (north) and KG Harder (Oosterbeek station to the Rhine) | [Battle of Arnhem][wiki-arnhem] |
| 19 Sep | First Tigers (Kompanie Hummel, first 2 of up to 6) and Sturmgeschütz-Brigade 280 arrive | Tigers: [506th Heavy Panzer Battalion][spz506]; StuG: TODO(history) |
| 19 Sep | Supply dropping point V in German hands from this day | PLAN §5.2, TODO(history) |
| 19 Sep ~10:00 | Grenadier Group arrives (PLAN §5.3 uses ~10:30 at the south edge) | [US Army CMH, ch. 7][cmh7] |
| 20 Sep ~19:10–19:15 | Grenadier Guards tanks cross the Nijmegen road bridge and link up with 3/504th | [US Army CMH, ch. 8][cmh8] |
| 20 Sep | One German Nebelwerfer battery joins the Arnhem–Oosterbeek fighting (design decision, PLAN §14.3) | – (design) |
| 21 Sep | Polish drop on the polder east of Driel instead of DZ K (after the slice) | PLAN §5.2, TODO(history) |
| 21 Sep | 130th Infantry Brigade (43rd Wessex, incl. 4th Dorsets) arrives (full campaign) | PLAN §5.3, TODO(history) |
| 23 Sep | 456th Parachute Field Artillery Bn arrives with the glider lift (design decision, full campaign) | – (design) |
| Night of 23/24 Sep | sPzAbt 506 (King Tigers) arrives at Zevenaar: 2nd company to Elst, 3rd company to the Oosterbeek perimeter | [506th Heavy Panzer Battalion][spz506] |
| Night of 25 Sep | About 2,400 men evacuated across the Rhine (Operation Berlin) | PLAN §5.6 and §14.2 (confirmed), TODO(history) |
| 2 Oct 1944 | German and Dutch clocks stop running one hour ahead of British time | [timeanddate][time] |

[railbridge]: https://www.battle-of-arnhem.com/john-frosts-battalion-captures-the-rhine-bridge-but-not-the-railway-bridge-and-the-ship-bridge/
[knaust]: https://weaponsandwarfare.com/?p=19638
[groesbeek]: https://warfarehistorynetwork.com/article/u-s-82nd-airborne-division-mook-holland-operation-market-garde/
[cmh7]: https://www.ibiblio.org/hyperwar/USA/USA-E-Siegfried/USA-E-Siegfried-7.html
[cmh8]: https://www.ibiblio.org/hyperwar/USA/USA-E-Siegfried/USA-E-Siegfried-8.html
[ferry]: https://france.liberationroute.com/pois/657/the-driel-ferry-disabled-for-the-germans-and-unusable-for-the-poles
[bridgeguard]: https://battle-of-arnhem.com/?p=987
[wiki-arnhem]: https://en.wikipedia.org/wiki/Battle_of_Arnhem
[spz506]: https://en.wikipedia.org/wiki/506th_Heavy_Panzer_Battalion
[time]: https://www.timeanddate.com/time/change/uk/london?year=1944
