# British and Polish forces

British 1st Airborne Division and the Polish units in "The Island" scenario. Taken from PLAN.md sections 5 and 14 (order of battle checked against sources on 15 October 2026).

Facts marked `TODO(history)` have no per-fact source link in the plan yet. Add one before relying on the fact.

All times are British time (UTC+1). See [terminology.md](terminology.md#time).

## 1st Airborne Division order of battle

| Unit | Commander | Type | Size | Approx. men | Arrival | Zone | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1st Airborne Division HQ | Maj-Gen Urquhart | HQ | – | – | 17 Sep 13:00 | LZ Z | PLAN §5.3, TODO(history) |
| 1st Parachute Brigade HQ | Brig Lathbury | HQ | – | – | 17 Sep ~13:50 | DZ X | PLAN §5.3, TODO(history) |
| 1st Parachute Battalion | Lt-Col Dobie | Airborne | II | 600 | 17 Sep ~13:50 | DZ X | PLAN §5.3, TODO(history) |
| 2nd Parachute Battalion | Lt-Col Frost | Airborne | II | 600 | 17 Sep ~13:50 | DZ X | PLAN §5.3, TODO(history) |
| 3rd Parachute Battalion | Lt-Col Fitch | Airborne | II | 600 | 17 Sep ~13:50 | DZ X | PLAN §5.3, TODO(history) |
| 1st Parachute Squadron RE | – | Engineers | I | 200 | 17 Sep ~13:50 | DZ X | PLAN §5.3, TODO(history) |
| 1st Airlanding Brigade HQ | Brig Hicks | HQ | – | – | 17 Sep 13:00 | LZ S | [1st Airlanding Bde report][airlanding] |
| 7th Bn King's Own Scottish Borderers (7 KOSB) | – | Infantry | II | 800 | 17 Sep 13:00 | LZ S | [1st Airlanding Bde report][airlanding] |
| 1st Bn Border Regiment (1 Border) | – | Infantry | II | 800 | 17 Sep 13:00 | LZ S | [1st Airlanding Bde report][airlanding] |
| 2nd Bn South Staffordshire Regiment (2 S Staffords), first half | – | Infantry | II | 400 | 17 Sep 13:00 | LZ S | [1st Airlanding Bde report][airlanding] |
| 1st Airborne Reconnaissance Squadron | Maj Gough | Recon | I | 180 | 17 Sep 13:00 | LZ Z | PLAN §5.3, TODO(history) |
| 1st Airlanding Anti-Tank Battery RA | – | Anti-tank | I | – | 17 Sep 13:00 | LZ Z | PLAN §5.3, TODO(history) |
| 1st Airlanding Light Regiment RA (75 mm pack howitzers) | – | Artillery | II | – | 17 Sep 13:00 | LZ Z | PLAN §5.3, TODO(history) |
| 9th (Airborne) Field Company RE | – | Engineers | I | – | 17 Sep 13:00 | LZ Z | PLAN §5.3, TODO(history) |
| 4th Parachute Brigade HQ | Brig Hackett | HQ | – | – | 18 Sep ~15:00 | DZ Y | PLAN §5.3, TODO(history) |
| 10th, 11th and 156th Parachute Battalions | – | Airborne | II each | 600 each | 18 Sep ~15:00 | DZ Y | PLAN §5.3, TODO(history) |
| 2 S Staffords, second half | – | Infantry | II (joins first half) | 400 | 18 Sep ~15:00 | LZ X | [1st Airlanding Bde report][airlanding] |

"Approx. men" and "Zone" are the plan's scenario defaults. The player chooses the actual zone for each lift unit before it lands.

## Polish forces

| Unit | Type | Size | Arrival | Zone | Source |
| --- | --- | --- | --- | --- | --- |
| Polish anti-tank battery (gliders) | Anti-tank | I | 19 Sep ~16:00 | LZ L | PLAN §5.3, TODO(history) |

- The planned Polish drop on DZ K (south end of the Arnhem road bridge) was replaced by the polder east of Driel, on 21 Sep (after the vertical slice ends). Source: PLAN §5.2, TODO(history).
- The Heveadorp ferry was gone when the Poles arrived. Source: [Liberation Route][ferry].

## Key facts

- 1st Airlanding Brigade had three battalions (7 KOSB, 1 Border, 2 S Staffords), not one brigade unit. 2 S Staffords was split across two lifts. Source: [1st Airlanding Bde report][airlanding].
- Only 1st Parachute Brigade (about 2,700 men) advanced on Arnhem on the first day. 1st Airlanding Brigade stayed to hold the zones for the later lifts. Source: PLAN §5.3, TODO(history).
- Routes to Arnhem: Leopard (1 Para Bn), Tiger (3 Para Bn) and Lion (2 Para Bn). Source: PLAN §14.2 (confirmed), TODO(history).
- A platoon of C Company, 2nd Parachute Battalion reached the Arnhem rail bridge at about 18:00 on 17 Sep as it was blown. Source: [battle-of-arnhem.com][railbridge].
- About 740 men under Frost (2nd Parachute Battalion, Brigade HQ, engineers, reconnaissance and others) reached the north end of the Arnhem road bridge around 20:00 on 17 Sep and held until about 05:00 on 21 Sep. Source: PLAN §5.6 and §14.2 (confirmed), TODO(history).
- About 2,400 men were evacuated across the Rhine on the night of 25 Sep (Operation Berlin). Source: PLAN §5.6 and §14.2 (confirmed), TODO(history).
- Allied airborne losses for the whole operation were about 11,850. Source: PLAN §5.6, TODO(history).
- At least 450 Dutch civilians died around Arnhem; afterwards the whole city was evacuated. Source: PLAN §5.6, TODO(history).

## Resupply

- About 2–14 % of each day's resupply reached the troops, because most zones were in German hands. Source: [Legion Magazine][legion].
- Supply dropping point V (north-west Arnhem) was in German hands from 19 Sep. Source: PLAN §5.2, TODO(history).

## Design decisions (PLAN §14.3)

These were not settled by sources. They are final for version 1.0 and can be revised if better evidence turns up.

- **1 Border on 17 Sep:** lands on LZ S, then moves to guard the zones at Renkum and Heelsum (scenario script).
- **Overall resupply recovered:** the debrief uses "about 7 %" of all resupply reaching 1st Airborne.

[airlanding]: https://vriendenairbornemuseum.nl/public/1Airborne_Division_Report_on_Operation_Market_partIV_annexO2_1AirLBdeOCR.pdf
[ferry]: https://france.liberationroute.com/pois/657/the-driel-ferry-disabled-for-the-germans-and-unusable-for-the-poles
[railbridge]: https://www.battle-of-arnhem.com/john-frosts-battalion-captures-the-rhine-bridge-but-not-the-railway-bridge-and-the-ship-bridge/
[legion]: https://legionmagazine.com/airmen-over-arnhem/
