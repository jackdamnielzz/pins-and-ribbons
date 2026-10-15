# Pins & Ribbons — Game Design & Development Plan

Oct 15, 2026 · @Niels Maas

Pins & Ribbons is a real-time-with-pause WWII strategy game played on a lamplit map table, starting with Operation Market Garden (September 1944) and shipping on Steam. This document is the single source of truth for the development team (Claude Code in VS Code): what to build, in what order, and how to know a task is done.

## 1. Overview

The player is an Allied commander standing over a map table in a 1944 operations room. Units are wooden blocks on a period staff map; orders are red ribbons stretched between map pins; the war arrives as signals, smoke and lamplight.

**Pitch:** "Command Operation Market Garden from the map table. Seize the bridges, hold the corridor, and get the armour to Arnhem before the airborne are overrun."

### Design pillars

1. **The table is the game.** Every visual and sound belongs to a real map room: paper, wood, pins, ribbons, typewriters, radio. No 3D battlefield, no floating fantasy UI.
2. **Readable at a glance, deep on inspection.** A new player understands the situation in seconds. Supply, timing, morale and terrain reward players who look closer.
3. **Time is the enemy.** Real time with pause. The clock, the bridges and the single road create the tension, not micro-management.
4. **Respectful history.** Real places, units and timelines, simplified for play. No glorification and no Nazi symbolism.

### Target audience

- Strategy players who like Unity of Command, Panzer Corps or Radio General but want something faster to learn.
- History enthusiasts, with extra appeal in the Netherlands, UK, US and Poland.
- Session length: 30 to 60 minutes per scenario, 2 to 3 hours for the full campaign.

## 2. Locked decisions

These decisions are final. The team does not revisit them without the product owner's approval.

| Topic | Decision |
| --- | --- |
| Title | Pins & Ribbons |
| Genre | Operational-level WWII strategy, top-down |
| Time model | Real time with pause, speeds 1x / 2x / 4x |
| First scenario | Operation Market Garden, 17–25 September 1944 |
| Platform | Steam (Windows first, macOS and Linux if Tauri builds pass QA); browser build for development and demos |
| Business model | Commercial, paid, single purchase |
| Difficulty | Accessible with depth: tutorial, clear odds, three difficulty levels |
| Language | All code, data, UI text and documentation in English |
| Engine | No game engine. TypeScript + Vite + PixiJS for rendering, HTML/CSS (Preact) for UI, Tauri for desktop |
| Art | No hand-drawn or Photoshop work. Map and units are generated in code; textures are CC0; illustrations are AI-generated |
| Multiplayer | Not in version 1.0 |
| Repository / folder name | `pins-and-ribbons` |

## 3. Scope

The project ships in two stages: a vertical slice that proves the game, then the full Market Garden campaign for the Steam release.

### Vertical slice: "The Island"

- Map: Arnhem to Nijmegen, 26 × 26 km (about 780 hexes).
- Time: 17 September 13:00 to 21 September 12:00.
- Allied side only: British 1st Airborne, US 82nd Airborne, Guards Armoured Division arriving from the south.
- All core systems working: movement, combat, morale, supply, command points, fog of war, bridges, airborne drops, German AI.
- Briefing, debriefing, tutorial, saves, three difficulty levels.
- Used for the Steam page trailer, screenshots and the public demo.

### Full release (version 1.0)

- Full corridor map: Belgian border (Joe's Bridge) to Arnhem, about 30 × 100 km.
- Full operation: 17 to 25 September 1944.
- Adds 101st Airborne (Eindhoven, Son, Veghel), Polish 1st Independent Parachute Brigade, 43rd Wessex Division and XXX Corps logistics.
- Two extra short scenarios cut from the campaign map (for example "Nijmegen Bridge" and "Hell's Highway").
- Steam achievements, cloud saves, settings, credits.

### Out of scope for 1.0

- Multiplayer of any kind.
- Playing the German side (planned as a post-launch update).
- Other operations (Overlord, Bulge, Veritable): post-launch DLC candidates.
- Localisation: the text system must support it, but only English ships at launch.
- Mod tools beyond editable JSON scenario files.

## 4. Gameplay specification

All numbers below are starting values. They live in `data/rules.json`, never hard-coded, so balancing needs no code changes.

### 4.1 Time

- The simulation runs in fixed ticks of **5 game minutes** (12 ticks per game hour).
- At 1x, one game hour takes **20 real seconds**; 2x takes 10 s, 4x takes 5 s.
- Pause (Space) stops the simulation. All orders can be given while paused.
- **Auto-pause** (on by default, per-event toggles in settings): bridge captured or blown, unit destroyed, first contact for a unit, reinforcements arrived, airborne lift landed.
- The game clock runs on British time (UTC+1), the time used in Allied war diaries; German and Dutch clocks were one hour ahead until 2 October 1944. Sunrise at Arnhem is about 06:15 and sunset about 18:45 British time. Day phases: dawn 05:45–06:45, day 06:45–18:15, dusk 18:15–19:15, night 19:15–05:45.

### 4.2 Map and hex grid

- 1 hex = 1 km across flats. Pointy-top hexes.
- Storage uses odd-r offset coordinates; all maths (distance, neighbours, line of sight, pathfinding) uses axial coordinates.
- One unit per hex. Units never stack.
- Each hex stores: terrain type, road flag, rail flag, river edge data, bridge reference, elevation band, town name (if any).

### 4.3 Terrain

Move cost is in hours per hex at a unit speed of 1 km/h; actual time = cost ÷ unit speed. Defence is a multiplier on the defender.

| Terrain | Foot cost | Mechanised cost | Defence | Sight blocking | Notes |
| --- | --- | --- | --- | --- | --- |
| Road (overlay) | 1.0 | 1.0 | as base terrain | no | Applies only when moving road hex to road hex |
| Open fields | 1.4 | 1.4 | 1.0 | no |  |
| Heath | 1.3 | 1.5 | 1.0 | no | Drop and landing zones |
| Polder | 2.0 | 3.4 | 0.95 | no | Dikes and ditches; armour is road-bound here |
| Woodland | 2.4 | 4.0 | 1.4 | yes |  |
| Built-up | 1.7 | 2.0 | 1.6 | yes | Towns and villages |
| Bridge | 1.0 | 1.0 | 1.15 | no | Only crossing of a river |
| River | impassable | impassable | – | no | Except by boat assault (engineers) |

### 4.4 Units

The manoeuvre unit is a battalion (II), regiment or brigade group (III), or a company-size detachment (I). Every unit has:

- **Strength** 0–100 (men and equipment; 100 = full 1944 establishment, for example about 600 men in a British parachute battalion, about 800 in an airlanding battalion, about 2,000 in a US parachute infantry regiment). Destroyed at 2 or below.
- **Morale** 0–100. Shaken below 40, routing below 20.
- **Supply** 0–100.
- **Experience**: Green, Regular, Veteran, Elite (+0 / +5 / +10 / +20 % attack and morale recovery).
- **Entrenchment** 0–3 levels, +10 % defence per level, gained after 2, 4 and 8 hours stationary out of contact.

| Type | Speed km/h (road) | Soft attack | Hard attack | Defence | Sight (hexes) | Special |
| --- | --- | --- | --- | --- | --- | --- |
| Infantry | 2 | 1.0 | 0.4 | 1.0 | 3 |  |
| Airborne infantry | 2.2 | 1.1 | 0.5 | 1.05 | 3 | Can be dropped; limited supply capacity |
| Armour | 5 | 1.0 | 1.4 | 1.15 | 3 | Mechanised costs; −30 % attack into woods and towns |
| Mechanised infantry (Panzergrenadier) | 3.5 | 1.2 | 0.7 | 1.1 | 3 | Mechanised costs |
| Reconnaissance | 5.5 | 0.6 | 0.3 | 0.7 | 5 | Reveals "?" contacts within sight |
| Anti-tank | 2 (towed) | 0.3 | 1.5 | 0.9 | 3 | Strong defender versus armour |
| Artillery | 2 (towed) | 1.2 (indirect) | 0.5 | 0.6 | 2 | Fires up to 8 hexes at a target in friendly sight |
| Engineers | 2 | 0.7 | 0.4 | 0.9 | 3 | Repair or demolish bridges, boat assault, Bailey bridge |
| Headquarters | 3 | 0.2 | 0.1 | 0.5 | 3 | Command radius 6 hexes; boosts command points and morale |

### 4.5 Orders and movement

- Order types: **Move**, **Attack** (move adjacent to a target and engage), **Hold** (stay and entrench), **Withdraw** (move away from contact at full speed, morale cost), and specials: **Fire mission** (artillery), **Demolish / Repair bridge** (engineers), **Request supply drop** (airborne).
- Pathfinding: A\* over hex costs. Known enemy hexes are impassable; friendly-occupied hexes add +0.6 h so units route around each other.
- A unit adjacent to an enemy moves at 50 % speed.
- Night: mechanised units move at 75 % speed; all units −20 % attack.
- The order is shown as a red ribbon from the unit along the path to a pin at the destination.

### 4.6 Combat

Combat is continuous. Each tick, every unit damages each adjacent enemy unit:

```latex
D = S_a \cdot A \cdot K \cdot M \cdot \Delta t \;/\; (F \cdot T \cdot E \cdot n)
```

- D = strength damage to the defender this tick; S\_a = attacker strength; A = soft or hard attack value (hard when the target is armour); K = 0.12 (global tuning constant); Δt = tick length in hours.
- M = product of attacker modifiers: morale (shaken × 0.7), supply (out of supply × 0.5), night × 0.8, artillery support × 1.25, combined arms (infantry and armour both adjacent to the same target) × 1.15, each extra attacking hex side beyond the first × 1.1.
- F = defender type defence; T = terrain defence; E = entrenchment (1 + 0.1 × level); n = number of enemies the attacker is engaging (fire is split).
- Morale loss = 1.5 × strength damage. Morale recovers 4 per hour out of contact, 8 within HQ command radius.
- At morale below 20 the unit routs: it automatically withdraws one hex per tick away from enemies until morale recovers to 35.
- **Odds preview:** before confirming an attack the UI shows expected losses per side over the next 6 game hours ("Attack odds 3:1 · expected losses: light / heavy"). Accuracy depends on difficulty (section 4.15).

### 4.7 Supply

- Supply sources: south map edge on the main road (XXX Corps); airborne supply drops (see 4.10); German sources on the north and east edges.
- A unit is in supply if a path of at most 14 cost-hours exists from a source, avoiding hexes adjacent to enemy units (zone of control).
- In supply: +6 supply per hour. Out of supply: −4 per hour. At 0: attack × 0.5, no entrenchment gain, morale recovery halved.
- Hell's Highway matters because a single enemy unit next to the road cuts supply to everything north of it.

### 4.8 Command points (CP)

- Each side has a CP pool (maximum 20). Regeneration: 2 per game hour plus 1 per active HQ.
- Costs: Move 1, Attack 2, Withdraw 1, Fire mission 2, Demolish or repair bridge 3, Supply drop 3, Boat assault 4. Cancelling an order is free.
- If CP is insufficient the order is refused with a clear message. This forces priorities without limiting clicks per minute.

### 4.9 Bridges

- States: **Intact**, **Prepared** (charges set), **Blown**.
- German engineers can prepare a bridge (4 h). Each hour an Allied unit is within 2 hexes of a prepared bridge still under German control, the bridge is blown with probability 25 % (Recruit 15 %, Veteran 35 %).
- Allied engineers adjacent to a prepared bridge can remove charges (2 h).
- Allied engineers can build a Bailey bridge on a blown crossing (12 h, needs supply ≥ 50).
- Control: a bridge belongs to the side that has units within 1 hex of it while the other side has none. Contested bridges keep their previous owner.

### 4.10 Airborne operations

- Lifts follow the historical schedule (section 5). Before each lift, the player assigns the arriving units to one of the scenario's drop or landing zones.
- On landing, each unit is scattered 0–3 hexes from the zone centre and loses 0–15 % strength. Scatter and loss scale with flak (German units within 3 hexes of the zone) and weather.
- Units landing on or next to enemy units start the scenario shaken.
- **Supply drops:** airborne units can request a drop on a chosen zone (3 CP). Delivered share: 60 % in good weather and 30 % in poor weather on an Allied-held zone; if the zone is German-held the Germans get it. Ground units cannot talk to the aircraft (historically there was no working ground-to-air link), so a changed zone only takes effect after 24 hours. Historically only about 2–14 % of each day's resupply reached 1st Airborne, because most zones were in German hands; the debrief shows this comparison.

### 4.11 Weather

- Each day has a scripted historical weather state with small random variation: Clear, Overcast, Fog, Rain.
- Fog and Rain delay or cancel airborne lifts and supply drops and reduce sight by 1 hex.
- Weather is forecast one day ahead in the briefing panel.

### 4.12 Fog of war

- Allied sight = union of all Allied units' sight radii (−1 at night, −1 in Fog or Rain; woods and towns block line of sight beyond the first hex).
- Enemy units outside sight are hidden. When first seen they show their type and an estimated strength band (Strong, Weakened, Shattered).
- After losing sight, a grey "?" block marks the last known position for 6 game hours, then fades.

### 4.13 German AI

Two layers, both utility-based, both reading the same game state the player can see plus full knowledge of Allied positions on Veteran only.

- **Operational layer (every game hour):** groups German units into Kampfgruppen and assigns each a goal: hold bridge, counter-attack objective, cut the corridor, screen. Goals are scored on threat, value and distance.
- **Tactical layer (every 15 game minutes):** each unit picks the best action for its goal: move, attack, hold, withdraw. It prefers flanks, avoids attacking into towns with armour, withdraws when routed.
- Scripted triggers for history: for example, 9th SS reconnaissance moves south across the Arnhem bridge on 17 September afternoon; 10th SS reinforces Nijmegen from the east via the Pannerden ferry.
- The AI never cheats on combat numbers; difficulty changes only its knowledge, reaction time and aggression.

### 4.14 Victory and scoring

- **Victory points (VP)** per game hour: Arnhem Road Bridge 3, Nijmegen Road Bridge 2, Nijmegen Rail Bridge 1, other scenario bridges 1. Plus: enemy strength destroyed (1 VP per 25 strength); minus own strength lost (1 VP per 25 strength).
- **Sudden victory:** an Allied armour unit reaches the Arnhem Road Bridge while it is Allied-held.
- **Defeat:** all British 1st Airborne units destroyed, or the main road cut for 24 consecutive hours after 20 September.
- Result tiers at the scenario end: Decisive Victory, Major Victory, Minor Victory, Stalemate, Defeat, based on VP and sudden-victory status. The debrief compares the result with what happened historically.

### 4.15 Difficulty levels

| Setting | Recruit | Regular | Veteran |
| --- | --- | --- | --- |
| CP regeneration per hour | 3 | 2 | 2 |
| Odds preview | Exact | ±15 % | Bands only |
| AI reaction time | 2 h | 1 h | 30 min |
| AI knows hidden Allied units | No | No | Yes |
| Bridge demolition chance per hour | 15 % | 25 % | 35 % |
| Airborne scatter | Low | Normal | High |

## 5. Scenario specification: "The Island" (vertical slice)

The vertical slice covers 17 September 13:00 to 21 September 12:00 on a map of about 25 × 35 km (25 × 40 hexes, decision 0005), from Heelsum in the west to Pannerden in the east, and from north of Arnhem to Groesbeek and Overasselt in the south. The order of battle below was checked against sources on 15 October 2026 (section 14). All times are British time (UTC+1); German and Dutch clocks ran one hour ahead. Exact start hexes are set in `data/scenarios/the-island.json`.

### 5.1 Objectives

| Objective | Start owner | VP per hour | Start state |
| --- | --- | --- | --- |
| Arnhem Road Bridge | German | 3 | Intact; only a few bridge keepers in a bunker at the north end |
| Arnhem Rail Bridge (Oosterbeek) | German | 0 | Blown at about 18:00 on 17 Sep as a platoon of C Company, 2nd Parachute Battalion runs onto it (scripted) |
| Arnhem pontoon bridge | – | 0 | Centre sections removed by the Germans; not crossable |
| Nijmegen Road Bridge | German | 2 | Intact and prepared for demolition; Model withholds permission to blow it (see 5.5) |
| Nijmegen Rail Bridge | German | 1 | Intact and prepared for demolition |
| Heveadorp–Driel ferry | Neutral | 0 | Usable by infantry (one unit per hour) until 20 Sep, when the ferryman disables it |

### 5.2 Drop and landing zones

| Zone | Location | Used by (historical) |
| --- | --- | --- |
| LZ S | North of Wolfheze | 1st Airlanding Brigade HQ, 7 KOSB, first half of 2 S Staffords, 1 Border (17 Sep) |
| LZ Z | Renkum Heath | Division HQ, Reconnaissance Squadron, Light Regiment RA, Anti-Tank Battery, 9th Field Company RE, 1st Parachute Brigade gliders (17 Sep) |
| DZ X | Renkum Heath | 1st Parachute Brigade parachutists and 1st Parachute Squadron RE (17 Sep) |
| DZ Y | Ginkel Heath, west edge | 4th Parachute Brigade (18 Sep) |
| LZ X | Next to DZ X | Second-lift gliders, including the rest of 2 S Staffords (18 Sep) |
| LZ L | Johannahoeve, north of Oosterbeek | Polish anti-tank battery gliders (19 Sep) |
| Supply dropping point V | North-west Arnhem | Planned resupply zone; in German hands from 19 Sep |
| DZ K | South end of the Arnhem road bridge | Planned Polish drop; replaced by the polder east of Driel (21 Sep, after the slice ends) |
| DZ O | Overasselt | 504th PIR; E Company on a separate zone next to the Grave bridge |
| DZ N | South of Groesbeek | 505th PIR, 82nd Division HQ, 376th Parachute Field Artillery Bn; gliders on 18 Sep |
| DZ T | North of Groesbeek | 508th PIR; gliders on 18 Sep |

### 5.3 Allied order of battle

| Unit | Type | Size | Approx. men | Arrival | Default zone or entry |
| --- | --- | --- | --- | --- | --- |
| 1st Airborne Division HQ (Maj-Gen Urquhart) | HQ | – | – | 17 Sep 13:00 | LZ Z |
| 1st Parachute Brigade HQ (Brig Lathbury) | HQ | – | – | 17 Sep \~13:50 | DZ X |
| 1st Parachute Battalion (Lt-Col Dobie) | Airborne | II | 600 | 17 Sep \~13:50 | DZ X |
| 2nd Parachute Battalion (Lt-Col Frost) | Airborne | II | 600 | 17 Sep \~13:50 | DZ X |
| 3rd Parachute Battalion (Lt-Col Fitch) | Airborne | II | 600 | 17 Sep \~13:50 | DZ X |
| 1st Parachute Squadron RE | Engineers | I | 200 | 17 Sep \~13:50 | DZ X |
| 1st Airlanding Brigade HQ (Brig Hicks) | HQ | – | – | 17 Sep 13:00 | LZ S |
| 7th Bn King's Own Scottish Borderers (7 KOSB) | Infantry | II | 800 | 17 Sep 13:00 | LZ S |
| 1st Bn Border Regiment (1 Border) | Infantry | II | 800 | 17 Sep 13:00 | LZ S |
| 2nd Bn South Staffordshire Regiment (2 S Staffords), first half | Infantry | II | 400 | 17 Sep 13:00 | LZ S |
| 1st Airborne Reconnaissance Squadron (Maj Gough) | Recon | I | 180 | 17 Sep 13:00 | LZ Z |
| 1st Airlanding Anti-Tank Battery RA | Anti-tank | I | – | 17 Sep 13:00 | LZ Z |
| 1st Airlanding Light Regiment RA (75 mm pack howitzers) | Artillery | II | – | 17 Sep 13:00 | LZ Z |
| 9th (Airborne) Field Company RE | Engineers | I | – | 17 Sep 13:00 | LZ Z |
| 4th Parachute Brigade HQ (Brig Hackett) | HQ | – | – | 18 Sep \~15:00 | DZ Y |
| 10th, 11th and 156th Parachute Battalions | Airborne | II each | 600 each | 18 Sep \~15:00 | DZ Y |
| 2 S Staffords, second half | Infantry | II (joins first half) | 400 | 18 Sep \~15:00 | LZ X |
| Polish anti-tank battery (gliders) | Anti-tank | I | – | 19 Sep \~16:00 | LZ L |
| 82nd Airborne Division HQ (Brig Gen Gavin) | HQ | – | – | 17 Sep \~13:00 | DZ N |
| 504th Parachute Infantry Regiment (Col Tucker) | Airborne | III | 2,000 | 17 Sep \~13:15 | DZ O |
| 505th Parachute Infantry Regiment (Col Ekman) | Airborne | III | 2,000 | 17 Sep \~13:00 | DZ N |
| 508th Parachute Infantry Regiment (Col Lindquist) | Airborne | III | 1,900 | 17 Sep \~13:26 | DZ T |
| 376th Parachute Field Artillery Bn (12 × 75 mm) | Artillery | II | – | 17 Sep \~13:33 | DZ N |
| 307th Airborne Engineer Bn | Engineers | II | – | 17 Sep \~13:00 | DZ N |
| 319th and 320th Glider Field Artillery Bns | Artillery | II each | – | 18 Sep (gliders) | DZ N / DZ T |
| 80th Airborne Anti-Aircraft (Anti-Tank) Bn | Anti-tank | II | – | 18 Sep (gliders) | DZ N |
| 2nd Household Cavalry Regiment (armoured cars) | Recon | II | – | 19 Sep \~08:30 | South edge, Grave road |
| Grenadier Guards Group (2nd Armd Bn + 1st Motor Bn, \~40 Shermans) | Armour + infantry | III | – | 19 Sep \~10:30 | South edge, main road |
| Irish Guards Group (2nd Armd Bn + 3rd Bn) | Armour + infantry | III | – | 19 Sep \~13:00 | South edge, main road |
| Coldstream Guards Group (1st Armd Bn + 5th Bn) | Armour + infantry | III | – | 19 Sep \~15:00 | South edge, main road |
| 130th Infantry Brigade (43rd Wessex; includes 4th Dorsets) | Infantry | III | – | 21 Sep (after the slice; full campaign) | South edge |

Only 1st Parachute Brigade (about 2,700 men) advanced on Arnhem on the first day; 1st Airlanding Brigade stayed to hold the zones for the later lifts. The scenario keeps that tension: the zones must be held or later lifts land under fire.

The player chooses the actual zone for each lift unit before it lands (section 4.10); the start areas above are defaults.

### 5.4 German order of battle

| Unit | Parent | Type | Approx. strength | Arrival | Start area | AI role |
| --- | --- | --- | --- | --- | --- | --- |
| Bridge keepers | – | Infantry I | a few men | On map | Bunker at the north end of the Arnhem road bridge | Hold |
| SS-Panzergrenadier-Ausbildungs- und Ersatz-Bataillon 16 (Krafft) | Training unit, later under von Tettau | Infantry II | \~435 | On map, active 17 Sep 13:40 | Woods at Wolfheze | Block the Utrechtseweg and Amsterdamseweg |
| Kampfgruppe Spindler | 9th SS | Infantry III (grows over time) | \~120 at first | 17 Sep \~17:00 | Dreyenseweg line, west Arnhem | Block; on 18 Sep splits into KG von Allwörden (north) and KG Harder (Oosterbeek station to the Rhine) |
| Kampfgruppe Möller (SS pioneers) | 9th SS | Engineers I | 80–90 | 17 Sep 16:30 | Den Brink, Arnhem | Block the Utrechtseweg |
| SS-Panzer-Aufklärungs-Abteilung 9 (Gräbner) | 9th SS | Recon II | \~400, \~40 vehicles | On map | North-east Arnhem | Scripted: south over the road bridge \~18:00 on 17 Sep; attacks north over the bridge 18 Sep 09:30 |
| Kampfgruppe Brinkmann (SS-Panzer-Aufklärungs-Abteilung 10) | 10th SS | Recon II | – | 17 Sep, late evening | East Arnhem | Seal the Arnhem bridge from the east |
| Kampfgruppe Knaust (Ersatz-Bataillon Bocholt, 8–10 Panzer III/IV) | Army | Armour II | 4 weak companies | 18 Sep 04:00 | North-east Arnhem | Assault the bridge perimeter |
| Flak battery Gropp | 9th SS | Anti-tank I | 1 × 88 mm, 1 × 20 mm | 18 Sep | Arnhem railway yard | Hold |
| Schwere Panzer-Kompanie Hummel (Tiger I) | Army | Armour I | up to 6 Tigers, first 2 on 19 Sep | 19 Sep | East Arnhem | Support the bridge assault |
| Sturmgeschütz-Brigade 280 (Kühme) | Army | Armour II | \~10 StuG | 19 Sep | Utrechtseweg | Attack towards Oosterbeek |
| SS-Unterführerschule "Arnheim" (Lippert) | Division von Tettau | Infantry III | 3 battalions | 18 Sep | West edge | Push east on Oosterbeek |
| Schiffsstammabteilung 10 | Division von Tettau | Infantry II | – | 18 Sep | Renkum | Attack Heelsum and the zones |
| SS-Wachbataillon 3 (Helle) | Division von Tettau | Infantry II | – | 18 Sep | Ginkel Heath | Contest DZ Y |
| Fliegerhorst battalions 2 and 3 | Division von Tettau | Infantry II each | – | 17–18 Sep | West edge | Attack DZ X |
| Kampfgruppe Henke (Fallschirmjäger training units, flak) | Army / Luftwaffe | Infantry II | \~750 | On map | Nijmegen: Kronenburgerpark and the rail bridge | Hold |
| Kampfgruppe Euling (II./SS-Panzergrenadier-Regiment 19 + pioneers) | 10th SS | Mechanised infantry II | \~500 | 18 Sep \~12:00 via Pannerden ferry | Hunner Park and the Valkhof | Hold the road bridge |
| Kampfgruppe Reinhold | 10th SS | Mechanised infantry II | – | 18 Sep \~12:00 via Pannerden ferry | North bank, Lent | Hold the north end of the bridges |
| II./SS-Panzer-Regiment 10 (\~16 Panzer IV) | 10th SS | Armour II | \~16 tanks | Night of 19 Sep via Pannerden ferry | Lent and Oosterhout | Counter-attack on the Island |
| Korps Feldt / 406th Landesschützen Division (Scherbening) | Army | Infantry III | \~2,300 | 18 Sep morning | Reichswald, east edge | Attack DZ N and Mook |
| Kampfgruppe Goebel (3 Wirbelwind flak tanks) | Korps Feldt | Infantry II | \~350 | 18 Sep | Reichswald, Mook road | Attack Mook |
| II. Fallschirmkorps (Meindl): KG Becker, KG Fürstenberg, KG Greschick, KG Hermann | 3rd and 5th Fallschirmjäger Divisions | Infantry III each | KG Hermann 650–700 | 20 Sep morning | Reichswald, east edge | Attack Wyler, Beek, Groesbeek and Mook respectively |

In the full campaign, schwere Panzer-Abteilung 506 (King Tigers) arrives at Zevenaar on the night of 23/24 September: its 2nd company goes to Elst and its 3rd company to the Oosterbeek perimeter.

### 5.5 Scripted timeline

| Game time (British time) | Event |
| --- | --- |
| 17 Sep 13:00 | First lift lands; scenario starts paused on the briefing |
| 17 Sep 13:40 | Krafft's battalion reports the landings and starts blocking |
| 17 Sep 14:30 | XXX Corps attacks from Joe's Bridge (off-map signal) |
| 17 Sep 16:30 | Kampfgruppe Möller reaches Den Brink |
| 17 Sep \~18:00 | Arnhem rail bridge blown; Gräbner's battalion drives south over the road bridge if it is still German |
| 17 Sep night | Weak 508th probe towards the Nijmegen road bridge is possible; Henke holds |
| 18 Sep 04:00 | Kampfgruppe Knaust arrives at Arnhem |
| 18 Sep 09:30 | Gräbner attacks north over the Arnhem bridge |
| 18 Sep morning | Korps Feldt attacks DZ N and Mook from the Reichswald |
| 18 Sep \~12:00 | 10th SS (Euling, Reinhold) reaches Nijmegen via the Pannerden ferry |
| 18 Sep \~15:00 | Second lift, about 5 hours late because of fog in England (extra delay possible) |
| 19 Sep 08:20 | Household Cavalry reaches Grave; Guards Armoured follows into the map |
| 19 Sep \~15:00 | Resupply drop on dropping point V (German-held); Polish gliders on LZ L \~16:00; 82nd gets only about half its gliders |
| 19 Sep 15:15 | Historical first Allied attack on the Nijmegen bridges (AI guidance only) |
| 19 Sep night | First Panzer IVs ferried over at Pannerden |
| 20 Sep morning | II. Fallschirmkorps attacks Groesbeek heights; Mook falls around 14:00 if weakly held |
| 20 Sep | Heveadorp ferry disabled |
| 20 Sep 15:00 | Historical 504th Waal crossing (26 canvas boats) available as a boat assault if engineers and boats are present |
| 20 Sep evening | Nijmegen road bridge demolition is authorised: from now on the normal demolition rule (4.9) applies |
| 21 Sep 05:00 | Historical end of resistance at the Arnhem bridge (debrief comparison only) |
| 21 Sep 12:00 | Scenario ends; debrief |

**Weather (scripted):** 17 Sep Clear; 18 Sep Overcast (fog delays the lift); 19 Sep Fog; 20 Sep Overcast, poor; 21 Sep Rain, poor.

### 5.6 Debrief history notes (shown after play)

- About 740 men under Frost (2nd Parachute Battalion, Brigade HQ, engineers, reconnaissance and others) reached the north end of the Arnhem road bridge around 20:00 on 17 September and held until about 05:00 on 21 September.
- 3rd Battalion, 504th PIR crossed the Waal in 26 canvas boats at 15:00 on 20 September; Grenadier Guards tanks crossed the Nijmegen road bridge at about 19:10 and linked up with them.
- XXX Corps never reached Arnhem. About 2,400 men were evacuated across the Rhine on the night of 25 September (Operation Berlin).
- Allied airborne losses for the whole operation were about 11,850; German losses are disputed (about 3,300 by German reports, higher by later estimates).
- At least 450 Dutch civilians died around Arnhem; afterwards the whole city was evacuated.

## 6. Art and audio direction

The look is "The General's Map Table": a 1944 staff map on a dark wooden table under a single lamp. Every asset is generated in code, downloaded as CC0, or AI-generated. Nobody on the team draws by hand or uses Photoshop.

### 6.1 Visual layers (bottom to top)

1. **Table:** dark oak texture (CC0), edges fading into shadow.
2. **Map sheet:** off-white paper rendered from map data (section 9). Sepia contour lines, blue rivers with bank lines and hatching, red-brown roads with dark casing, black railways with ticks, buildings as small dark rectangles, woodland as stippled tree symbols, polder as fine field-strip lines, heath with tufts.
3. **Map furniture:** 1 km Nord de Guerre grid printed in blue, with six-figure map references without letters (as in the 1st Airborne Division war diaries) and 24-hour times in all signals, a cartouche ("Sheet 1 · Arnhem – Nijmegen · 1:100,000"), scale bar, north arrow, fold lines, coffee stains, pencil annotations of drop zones (for example "LZ 'S'") and the XXX Corps axis ("Club Route").
4. **Hex grid:** invisible by default; faint pencil hexes around the cursor and the selected unit.
5. **Objective pins:** large map pins at each bridge, ribbon colour shows the owner.
6. **Order ribbons:** red ribbon from a unit along its path to a brass destination pin, drawn in over 0.4 s.
7. **Units:** painted wooden blocks with a paper sticker showing a 1943-style conventional sign (US FM 21-30: rectangle with arm symbol, size marks above, airborne "gull wing"; NATO frame shapes are post-war and are not used; enemy signs printed in red, as on Allied staff maps), size marker, short name and a 5-segment strength bar. Soft shadow; slight lift and click when moved.
8. **Effects:** smoke puffs and muzzle flashes at combat locations, ink-splash markers for destroyed units, rain drops on the table glass in bad weather.
9. **Lighting:** warm lamp pool during the day; blue night tint with a darker vignette at night; smooth transitions at dawn and dusk.

### 6.2 Palette and type

| Token | Use | Value |
| --- | --- | --- |
| Paper | Map and UI slips | #ECE2C6 |
| Ink | Text and line work | #2A2219 |
| Ribbon red | Orders, Allied ownership, alerts | #B3232B |
| Brass | Selected states, buttons | #C8A35A |
| British olive | British blocks | #66703D |
| US khaki | US blocks | #76704A |
| Polish | Polish blocks | #7A5A4A with white-red sticker band |
| German field grey | German blocks | #5A6163 |
| Water | Rivers | #A8C2CC |

Fonts (from the Google Fonts library, self-hosted in `assets/fonts/`, see decision 0003; SIL Open Font License except Special Elite, which is Apache 2.0): **Stardos Stencil** for titles and unit names, **Special Elite** for typewriter text and signals, **IM Fell English** for map labels, **Reenie Beanie** for pencil annotations.

Faction is never shown by colour alone: German blocks carry a black cross (Balkenkreuz) on the sticker, Allied blocks a roundel or star, so the game is colour-blind safe.

### 6.3 Asset sources

| Asset | Source | Licence |
| --- | --- | --- |
| Map | Generated from OpenStreetMap and elevation data (section 9) | ODbL attribution in credits |
| Unit blocks, NATO symbols, pins, ribbons, stamps | Procedural (SVG and PixiJS Graphics) | Own |
| Fonts | Google Fonts library, self-hosted as woff2 in `assets/fonts/` | SIL OFL 1.1; Special Elite Apache 2.0 |
| Wood, paper, leather textures | ambientCG, Poly Haven | CC0 |
| Illustrations (title screen, officer portraits, Steam capsule art) | AI image generation from the prompt library in `docs/art-prompts.md` | Own, check generator terms for commercial use |
| Sound effects | freesound.org (CC0 only) or generated | CC0 |
| Music | Generated with Suno on a paid plan that allows commercial use | Per Suno terms |
| Voice lines | Text-to-speech with a commercial licence, processed through a radio filter | Per provider terms |

### 6.4 Audio

- Ambience: clock tick, ceiling fan, distant artillery that grows when combat is near the camera, radio static.
- UI: typewriter keys for log entries, wooden click when a block is placed, pin push for orders, rubber stamp for confirmations.
- Signals: short radio voice lines for key events ("Bridge at Nijmegen is in our hands, sir.").
- Music: restrained orchestral and piano; quiet during play, fuller on the title, briefing and debrief screens.
- Separate volume sliders: master, music, effects, voice.

### 6.5 Content rules

- No swastikas or SS runes anywhere, including flags, insignia and unit names on blocks (use "10th SS" in text only).
- No gore. Losses are shown as strength numbers, smoke and ink marks.
- Real place names, unit names and commanders are allowed. No quotes from books or films.

## 7. UX and UI

The UI is a set of paper slips pinned to the table. It is built in HTML/CSS (Preact) on top of the PixiJS canvas so text stays sharp and accessible.

### 7.1 Screens

1. **Title:** lamplit table with a closed dossier; New Campaign, Continue, Scenarios, Settings, Credits, Quit.
2. **Scenario select:** dossiers for each scenario with date, size, difficulty and best result.
3. **Briefing:** "TOP SECRET" dossier: situation, orders, forces, weather forecast, lift schedule. Button: Begin operation.
4. **Lift planning:** before each airborne lift, assign units to zones on the map.
5. **Game:** map table with HUD.
6. **Debrief:** result tier, VP breakdown, losses per side, timeline of key events, "What happened in 1944" notes.
7. **Settings:** audio, display (UI scale 80–150 %, fullscreen), gameplay (auto-pause per event, default speed, edge scrolling), controls (remapping), accessibility.

### 7.2 In-game HUD

| Area | Content |
| --- | --- |
| Top left | Title slip; menu button |
| Top centre | Date and time, day phase, weather; speed controls (Pause, 1x, 2x, 4x); auto-pause toggle |
| Top right | Objectives with owner ribbons and VP per hour; CP pool |
| Bottom left | Signals log (teleprinter style), newest first, click an entry to jump to its location |
| Bottom right | Selected unit card: name, type, size, strength, morale, supply, experience, entrenchment, status, current order with ETA, order buttons |
| Cursor tooltip | Hex terrain, road, grid reference, move time for the selected unit, attack odds preview over enemies |

### 7.3 Controls

| Action | Mouse / keyboard |
| --- | --- |
| Select unit | Left-click block; drag a box to select several |
| Move order | Right-click hex (or left-click with Move selected) |
| Attack order | Right-click a visible enemy |
| Add waypoint | Shift + right-click |
| Hold / Withdraw | H / W |
| Pause / resume | Space |
| Speeds | 1, 2, 3 |
| Cycle units | Tab |
| Pan / zoom | WASD or arrow keys, middle-drag, edge scroll; mouse wheel |
| Jump to last event | J |

All keys are remappable. Every action is also reachable with the mouse only.

### 7.4 Onboarding and accessibility

- **Tutorial:** three short guided missions on a small map (Move and combat, Bridges and supply, Airborne drop) with step-by-step instructions and checks.
- **Tooltips everywhere:** every number in the UI explains itself on hover.
- Odds preview before every attack; auto-pause on important events.
- UI scale setting; minimum body text 14 px at 100 %.
- Colour-blind safe faction markers (section 6.2).
- Keyboard focus is visible on every control.

## 8. Technical architecture

The game is a web application: a deterministic simulation core in plain TypeScript, a PixiJS renderer, a Preact UI, and a Tauri shell for Steam. The core never imports anything from rendering, UI, audio or the platform.

### 8.1 Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Language | TypeScript 5, `strict: true` | No `any` without a comment explaining why |
| Build and dev server | Vite |  |
| Rendering | PixiJS v8 (WebGL, WebGPU when available) | 2D only; filters for shadows, lighting, night tint |
| UI | Preact + Preact Signals, CSS modules | DOM overlay on top of the canvas |
| Audio | Howler.js |  |
| Hex maths | Own module (`src/core/hex`) | Small and fully tested; no dependency |
| Pathfinding | Own A\* with binary heap |  |
| Tests | Vitest (unit), Playwright (UI smoke tests) |  |
| Lint and format | ESLint (typescript-eslint), Prettier | Lint rule forbids DOM, Pixi or Preact imports inside `src/core` and `src/ai` |
| Desktop | Tauri 2 | Steamworks via the `steamworks` Rust crate exposed as Tauri commands |
| Map tooling | Node.js scripts in `tools/` | See section 9 |

New runtime dependencies need product-owner approval.

### 8.2 Repository layout

```
pins-and-ribbons/
  CLAUDE.md                 working agreement for Claude Code (section 12)
  docs/
    PLAN.md                 this document, exported
    art-prompts.md          prompt library for AI illustrations
    decisions/              one short markdown file per architecture decision
  data/
    rules.json              all tuning numbers from section 4
    units.json              unit type definitions
    scenarios/
      the-island.json       scenario: OOB, objectives, zones, timeline, weather
    maps/
      the-island/           generated by tools/mapgen (hexes.json, layers.geojson)
  src/
    core/                   pure simulation, no side effects outside the state
      hex/                  coordinates, neighbours, distance, line of sight
      state/                types, creation from scenario, (de)serialisation
      systems/              arrivals, orders, movement, vision, combat, morale,
                            supply, bridges, airborne, weather, objectives, victory
      rng.ts                seeded PRNG (the only randomness allowed in core)
      tick.ts               runs one 5-minute tick in a fixed system order
    ai/                     German AI (operational + tactical layers)
    render/                 PixiJS scene: table, map, grid, pins, ribbons, units, fx, lighting
    ui/                     Preact screens and HUD components
    audio/                  sound manager, event-to-sound mapping
    platform/               web and Tauri implementations of saves, settings, achievements
    i18n/en.json            every player-facing string
    main.ts                 boot, game loop, wiring
  tools/
    mapgen/                 OSM + elevation to map data (section 9)
    balance/                headless batch runner for balancing
  src-tauri/                desktop shell and Steamworks bridge
  assets/                   textures, audio, fonts, illustrations
  tests/                    Playwright tests (unit tests sit next to the code)
```

### 8.3 Simulation loop

- `main.ts` accumulates real time × speed into game time and calls `tick(state, commands)` once per 5 game minutes. The renderer interpolates unit positions between ticks for smooth motion at 60 fps.
- `tick` runs systems in this fixed order: arrivals → weather → AI decisions → player commands → movement → vision → combat → morale and routing → supply → bridges → objectives → victory check.
- The player never mutates state directly. UI actions become **commands** (`{type: 'move', unitId, path}`) that are validated (CP, legality) inside `tick`.
- Each tick returns an **events** array (`bridgeCaptured`, `unitDestroyed`, `contact`, `arrival`, ...). UI, audio, log and auto-pause react to events only.
- Determinism: the same scenario, seed and command list always produce the same result. No `Math.random`, `Date` or floating timers in core. Every save stores the seed and the command log so bugs can be replayed exactly.

### 8.4 Data formats

Scenario file (excerpt):

```json
{
  "id": "the-island",
  "title": "The Island",
  "map": "maps/the-island",
  "start": "1944-09-17T13:00",
  "end": "1944-09-21T12:00",
  "playerSide": "allied",
  "objectives": [
    { "id": "arnhem-road-bridge", "name": "Arnhem Road Bridge", "hex": [15, 8], "owner": "german", "vpPerHour": 3, "bridge": "intact" }
  ],
  "zones": [
    { "id": "DZ-X", "name": "DZ X", "hexes": [[4, 4], [5, 4], [4, 5]] }
  ],
  "units": [
    { "id": "uk-2para", "name": "2nd Parachute Battalion", "short": "2 PARA", "side": "allied", "nation": "uk", "type": "airborne", "size": "II", "strength": 85, "experience": "veteran", "arrival": { "time": "1944-09-17T13:00", "zone": "DZ-X", "lift": 1 } }
  ],
  "timeline": [
    { "time": "1944-09-17T13:30", "action": "blowBridge", "objective": "arnhem-rail-bridge" }
  ],
  "weather": { "1944-09-17": "clear", "1944-09-18": "overcast", "1944-09-19": "fog" }
}
```

Rules file (excerpt):

```json
{
  "tickMinutes": 5,
  "secondsPerGameHour": { "1": 20, "2": 10, "4": 5 },
  "combat": { "k": 0.12, "nightAttack": 0.8, "combinedArms": 1.15 },
  "terrain": { "polder": { "foot": 2.0, "mech": 3.4, "defence": 0.95 } },
  "commandPoints": { "max": 20, "regenPerHour": 2, "cost": { "move": 1, "attack": 2 } }
}
```

All files are validated against JSON Schemas in `data/schema/` at load and in CI.

### 8.5 Saves

- A save is versioned JSON: `{version, scenarioId, seed, state, commandLog}`.
- Autosave every 6 game hours and on quit; 3 rotating autosave slots plus manual slots.
- Web build: IndexedDB. Desktop: files in the app data folder, synced by Steam Cloud.
- Loading an older save version runs migration functions; unknown versions are refused with a clear message.

### 8.6 Testing

- **Unit tests** for every core module: hex maths, pathfinding, each system, serialisation round-trip. Target: 90 % line coverage in `src/core`.
- **Golden replay tests:** recorded seed + command logs whose final state hash must not change unless a rule change is intended.
- **Balance runner** (`npm run balance -- --runs 200`): plays the scenario headless with a scripted Allied plan against the AI and reports win rates, average VP, bridge timings and losses per side.
- **UI smoke test** (Playwright): start scenario, select a unit, give a move order, pause, save, load.

### 8.7 Performance budgets

| Metric | Budget |
| --- | --- |
| Frame rate | 60 fps at 1920 × 1080 on an integrated GPU (Intel Iris Xe class) |
| Simulation tick | < 2 ms for 200 units and 3,000 hexes |
| Pathfinding | < 1 ms per path on the full corridor map |
| Scenario load | < 3 s from click to playable |
| Desktop download size | < 250 MB |
| Memory | < 600 MB |

## 9. Map generation pipeline

Maps are generated by a Node.js script from open geodata, then corrected by hand-authored override files so the result matches 1944, not today. The script runs once per scenario; its output is committed to the repository.

1. **Define the extent** in `tools/mapgen/regions/the-island.json`: bounding box (WGS84), projection (Dutch RD New, EPSG:28992), hex size 1 km, origin.
2. **Fetch OpenStreetMap data** via the Overpass API: rivers and water areas, primary and secondary roads, railways, woodland, heath, place names; and BAG building footprints built in 1944 or earlier (PDOK) for the 1944 built-up area. Cache raw responses in `tools/mapgen/cache/` (not committed).
3. **Fetch elevation**: SRTM 30 m tiles (or AHN for the Netherlands), resampled to 100 m, for contour lines and elevation bands per hex.
4. **Apply historical overrides** from `tools/mapgen/overrides/the-island.geojson`: remove post-war features (motorways A12, A50, A325, the Pannerdens Kanaal bridges and the modern Waal bridges), keep the 1944 ferries, and add sourced 1944 land cover (settlement cores of Arnhem and Nijmegen, heath on the drop zones). Only crossings with a 1944 source are kept, each with its state on 17 September 1944 (decision 0006). Every override has a `source` property naming the historical reference used; the facts are in `docs/history/map.md`.
5. **Simplify** geometry (Douglas–Peucker, 25 m tolerance) and project to map kilometres.
6. **Classify hexes**: terrain by majority land cover with priority river > built-up > woodland > heath > polder > open, where built-up means 1944 building footprints or a settlement core (decision 0006); road flags from trunk, primary and secondary roads, and rail flags; river edges; bridges where a road or rail line crosses a river (decision 0005).
7. **Validate**: rivers form continuous barriers (no land path across a river except via bridges and ferries); every objective and zone hex exists; the main road is continuous from the south edge to Arnhem along the Club Route (Grave bridge, Heumen bridge, Nijmegen road bridge, Elst, Arnhem road bridge) over crossings that are intact at the start. The script fails loudly on any error.
8. **Write output** to `data/maps/the-island/`: `hexes.json` (terrain per hex), `layers.geojson` (styled vector layers for the renderer), `labels.json` (place names with priority), `meta.json` (extent, projection, OSM attribution).

The renderer draws the map once at load into a high-resolution texture in the period style described in section 6, adds paper noise with a shader, and reuses that texture every frame.

## 10. Steam release requirements

The game ships as a Tauri 2 desktop application with Steamworks integration. The browser build stays available for development and the web demo.

- **Steamworks:** initialise via the `steamworks` Rust crate in `src-tauri`; expose `unlockAchievement`, `setStat`, `cloudSave`, `cloudLoad`, `overlayActive` as Tauri commands; `src/platform/steam.ts` wraps them behind the same interface as the web build.
- **Achievements (first set):** "A Bridge Not Too Far" (link-up at Arnhem), "Hold Until Relieved" (Arnhem bridge Allied-held for 48 consecutive hours), "Waal Crossing" (capture both Nijmegen bridges before 20 September 18:00), "Every Man Home" (finish with no British airborne unit destroyed), "Iron Corridor" (main road never cut for more than 2 hours), one achievement per difficulty for a Major Victory or better.
- **Steam Cloud:** saves and settings.
- **Controller support:** not required for 1.0; Steam Deck compatibility is a stretch goal (mouse-trackpad mapping, UI scale 125 %).
- **Store page:** goes live during the vertical slice milestone to collect wishlists. Needs: capsule images in all required sizes (AI illustration + stencil logo), 5+ screenshots, a 60–90 s trailer captured in-game, short and long descriptions, content descriptors (historical violence, no gore).
- **Demo:** the first 24 game hours of "The Island", released for a Steam Next Fest.
- **Builds:** Windows 10/11 x64 is the primary target. macOS (universal) and Linux (also Steam Deck) ship only if they pass the same QA checklist.
- **Legal:** OpenStreetMap ODbL attribution and font licences in the credits; music, voice and illustration licences documented in `docs/licences.md`.

## 11. Milestones

Work happens strictly one milestone at a time, in this order. A milestone is done only when every acceptance criterion passes and the product owner has played the build. Estimates assume part-time work (evenings and weekends) with Claude Code doing most of the implementation.

| # | Milestone | Estimate | Outcome |
| --- | --- | --- | --- |
| M0 | Project setup | 1 week | Empty table renders; tooling and CI work |
| M1 | Map pipeline and renderer | 2–3 weeks | The Island map generated and drawn in period style |
| M2 | Units, time and movement | 2 weeks | Blocks move on orders in real time with pause |
| M3 | Combat, morale and fog of war | 2 weeks | Units fight, rout and die; enemies hidden until seen |
| M4 | Objectives, supply and command points | 2 weeks | Bridges change hands; supply and CP shape decisions |
| M5 | German AI | 2–3 weeks | AI defends, counter-attacks and follows the script |
| M6 | Airborne, bridges, weather, reinforcements | 2 weeks | Full scenario systems in place |
| M7 | UI, audio, saves and tutorial | 3 weeks | Complete player-facing experience |
| M8 | Vertical slice: balance and polish | 2 weeks | Shippable demo; Steam page live |
| M9 | Full corridor campaign | 6–8 weeks | Joe's Bridge to Arnhem, 17–25 September |
| M10 | Steam release | 3–4 weeks | Tauri build, Steamworks, QA, launch |

### M0 — Project setup

- [ ] Create the repository layout from section 8.2 with Vite, TypeScript strict, PixiJS, Preact, Vitest, ESLint, Prettier.
- [ ] Add the core-isolation lint rule.
- [ ] Add `CLAUDE.md` (section 12) and export this plan to `docs/PLAN.md`.
- [ ] Render a wood table background with a blank paper sheet; pan with drag, zoom with the wheel.
- [ ] GitHub Actions: lint, type-check, test on every push.

**Done when:** `npm run dev` shows the table and sheet; `npm test` and `npm run lint` pass; CI is green.

### M1 — Map pipeline and renderer

- [ ] `tools/mapgen` steps 1–8 from section 9 for The Island.
- [ ] Historical override file with sources for every change.
- [ ] Hex module with tests (conversions, neighbours, distance, pixel-to-hex).
- [ ] Map renderer: all layers from section 6.1 items 2–4, labels, grid references, cartouche.
- [ ] Hover tooltip with terrain, road and grid reference.

**Done when:** the validation step passes; the map is recognisable against a 1944 map of the area; hover shows correct terrain; 60 fps while panning.

### M2 — Units, time and movement

- [ ] State types and scenario loader with JSON Schema validation.
- [ ] Fixed 5-minute tick, pause and speeds, interpolated rendering.
- [ ] Unit blocks with stickers and period conventional signs (section 6.1).
- [ ] Selection, move order, A\* pathfinding with terrain costs, order ribbons and destination pins.
- [ ] Day/night lighting.

**Done when:** 2 PARA ordered from DZ X to the Arnhem bridge along the road arrives in 4–6 game hours; units never enter rivers or occupied hexes; the same command log produces the same result twice (test).

### M3 — Combat, morale and fog of war

- [ ] Combat formula from 4.6 with all modifiers; morale, routing, entrenchment.
- [ ] Vision with line of sight; "?" last-known contacts.
- [ ] Odds preview; signals log; combat effects.

**Done when:** unit tests cover every modifier; a full-strength battalion in a town holds against an equal attacker for at least 12 hours; hidden enemies never render.

### M4 — Objectives, supply and command points

- [ ] Objective control and VP per hour; objectives panel.
- [ ] Supply tracing with zones of control; supply UI on unit card and as a map overlay toggle.
- [ ] CP pool, costs, refusals with clear messages.

**Done when:** placing one German unit next to the main road cuts supply to all Allied units north of it within one tick; VP totals match a hand-calculated test case.

### M5 — German AI

- [ ] Operational layer with Kampfgruppe goals; tactical layer per unit.
- [ ] Scripted triggers from section 5.5.
- [ ] Difficulty settings from 4.15.

**Done when:** in 200 headless runs with a passive Allied player, the AI retakes the Arnhem bridge in over 90 % of runs; with the scripted historical Allied plan, win rates sit between 30 % and 60 % on Regular.

### M6 — Airborne, bridges, weather, reinforcements

- [ ] Lift planning screen, scatter and landing losses, supply drops.
- [ ] Bridge states, demolition, charge removal, Bailey bridges, Heveadorp ferry.
- [ ] Weather per day with effects; reinforcements on schedule.

**Done when:** all scripted events in 5.5 fire on time; a blown bridge blocks pathfinding until a Bailey bridge is finished.

### M7 — UI, audio, saves and tutorial

- [ ] All screens from 7.1, HUD from 7.2, controls and remapping from 7.3.
- [ ] Audio from 6.4 with volume settings.
- [ ] Saves and autosaves (8.5).
- [ ] Three tutorial missions.

**Done when:** a new player completes the tutorial without outside help (tested with at least two people); save and load round-trips are exact.

### M8 — Vertical slice

- [ ] Balance passes with the balance runner on all three difficulties.
- [ ] Performance budgets from 8.7 met.
- [ ] Trailer capture mode (hide HUD, smooth camera paths).
- [ ] Steam store page assets; historical cross-check against print sources (section 14.3).

**Done when:** the demo build runs start to finish without errors on the target hardware; Steam page submitted for review.

### M9 — Full corridor campaign

- [ ] Corridor map (Joe's Bridge to Arnhem) through the same pipeline.
- [ ] 101st Airborne, Polish brigade, 43rd Wessex, XXX Corps logistics; two short scenarios.

**Done when:** the full campaign is playable from 17 to 25 September with all historical events, and the balance runner reports results within target bands.

### M10 — Steam release

- [ ] Tauri builds, Steamworks features from section 10, credits and licences.
- [ ] QA checklist on Windows (and macOS/Linux if shipped).

**Done when:** release candidate passes QA; Steam review approved; launch date set.

## 12. Working agreement for Claude Code

Claude Code reads `CLAUDE.md` at the start of every session. It holds the rules below; the full plan lives in `docs/PLAN.md`.

### 12.1 CLAUDE.md content

```markdown
# Pins & Ribbons

Real-time-with-pause WWII strategy game on a 1944 map table. First scenario: Operation Market Garden. Target: Steam.
The full design and plan is in docs/PLAN.md. Read the relevant sections before starting any task.

## Rules
- Everything is in English: code, comments, data, UI text, commit messages, docs.
- Work on one milestone task at a time, in the order of docs/PLAN.md section 11.
- src/core and src/ai are pure TypeScript: no DOM, PixiJS, Preact, audio or platform imports. No Math.random or Date; use src/core/rng.ts.
- All tuning numbers live in data/rules.json; all player-facing text lives in src/i18n/en.json.
- Every core change comes with unit tests. Run `npm test` and `npm run lint` before you say a task is done.
- Historical facts (unit names, dates, places, terminology, tactics) come only from docs/history/. Never invent them. If a fact is missing, add a `TODO(history)` comment and list it in your summary.
- Ask before adding a runtime dependency.
- Keep commits small: one task per commit, conventional commit messages (feat:, fix:, refactor:, test:, docs:).
- When a decision changes the design, update docs/PLAN.md in the same commit and add a note in docs/decisions/.

## Commands
- npm run dev        start the browser build
- npm test           unit tests
- npm run lint       lint and type-check
- npm run mapgen     regenerate map data
- npm run balance    headless balance runner
```

### 12.2 How to brief a task

Start each session with one task from section 11, referencing the plan. Example:

> Read docs/PLAN.md sections 4.5 and 8.3. Implement milestone M2, task 4: selection, move order, A\* pathfinding with terrain costs, order ribbons and destination pins. Write tests for pathfinding. Stop when the M2 acceptance criteria for movement pass and summarise what you changed.

### 12.3 Definition of done for every task

- Code builds, `npm test` and `npm run lint` pass.
- New behaviour is covered by tests (core) or a short manual check list in the summary (UI).
- No hard-coded numbers or strings that belong in `rules.json` or `en.json`.
- `docs/PLAN.md` updated if the design changed.

## 13. Risks, open questions and glossary

### 13.1 Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Real time with pause is harder to balance than turns | Frustrating difficulty spikes | Auto-pause, odds preview, headless balance runner from M5 onward |
| Generated map does not look "premium" | Weak Steam page | Map renderer is milestone M1; judge it early against reference images before building systems on top |
| Historical errors | Credibility with the core audience | Historical research pack (section 14) with sources; every scenario fact traceable |
| Scope creep (full corridor, German side, more operations) | Release slips | Locked decisions (section 2); post-launch list |
| Licensing of AI music, voices and illustrations | Store or legal issues | Paid plans with commercial rights; licences tracked in docs/licences.md |
| Part-time development pace | Long gaps | Small tasks, one commit each; plan and CLAUDE.md keep context across sessions |

### 13.2 Commercial decisions

| Topic | Decision | Reason |
| --- | --- | --- |
| Price | €19.99 / $19.99, with a 10 % launch discount for the first week | Matches the closest comparable (Radio General, $19.99) and sits below larger operational wargames (Unity of Command II $29.99, Headquarters: World War II $39.99). A 10 % launch discount nudges wishlisters without lowering perceived value. See the price research below. |
| Steam Next Fest | The June 2027 edition, with the vertical slice demo | M0–M8 take about 5 months, so the demo is ready in spring 2027 with time for wishlists; the October edition is the fallback if M8 slips |
| Dutch localisation | Free update within three months after launch | Keeps the launch scope small; the Dutch market is a natural second audience for a Market Garden game |
| Playable German side | First free update after launch | Extends the life of the game and earns goodwill and reviews; paid DLC is reserved for new operations (Overlord, Bulge, Veritable) |

**Price research (15 October 2026).** Regular Steam prices of comparable games:

| Game | Type | Regular price |
| --- | --- | --- |
| Radio General | WWII strategy, indie, stylised command view | $19.99 |
| Radio Commander | Vietnam command game, indie, map-table style | about $17 (C$22.79) |
| Unity of Command II | Operational WWII wargame, large campaign plus DLC | $29.99 |
| Headquarters: World War II | 3D tactical WWII, larger studio | $39.99 |

Indie pricing guidance puts polished single-player games with distinctive art at $14.99–$19.99; $24.99–$29.99 needs deep systems, lots of content and visible pre-launch momentum. Pins & Ribbons at launch has one full campaign and a few scenarios, so $19.99 is the ceiling, not the floor: if the full campaign ends up under 3 hours of play, the price drops to €14.99 / $14.99. Set regional prices from Steam's suggestions instead of auto-conversion.

The technology stack does not lower what players will pay. Players judge art, content and reviews, not the engine: Vampire Survivors launched as a premium Steam hit built on Phaser, a JavaScript web framework, and only later moved to Unity for performance. Our performance budgets (section 8.7) cover that risk.

Sources: [Radio General](https://steambase.io/games/radio-general/price), [Radio Commander](https://gg.deals/ca/game/radio-commander/), [Unity of Command II](https://gg.deals/steam/app/809230/), [Headquarters: World War II](https://gamegeeker.com/games/headquarters-world-war-ii), [pricing guide](https://gtstu.com/steam-indie-game-pricing-strategy/), [Vampire Survivors](https://en.wikipedia.org/wiki/Vampire_Survivors).

### 13.3 Glossary

| Term | Meaning |
| --- | --- |
| CP | Command points: the budget for giving orders |
| DZ / LZ | Drop zone (parachutists) / landing zone (gliders) |
| Kampfgruppe (KG) | German ad-hoc battle group named after its commander |
| OOB | Order of battle: the list of units in a scenario |
| VP | Victory points |
| ZOC | Zone of control: hexes adjacent to an enemy unit |
| XXX Corps | British ground force advancing up the corridor |
| Bailey bridge | Prefabricated portable bridge used by Allied engineers |
| Tick | One 5-minute simulation step |
| The Island | The Betuwe between the Waal and the Neder Rijn, between Nijmegen and Arnhem |

## 14. Historical research

On 15 October 2026 four independent research passes checked this plan against archive and reference sources: British and Polish forces, US 82nd Airborne and XXX Corps, German forces, and tactics, terminology and conditions. Sections 4, 5 and 6 already include the corrections below.

### 14.1 Corrections made

| Topic | First draft said | Verified fact | Source |
| --- | --- | --- | --- |
| Arnhem rail bridge | Blown at 13:30 | Blown at about 18:00 as a C Company, 2 Para Bn platoon reached it | [battle-of-arnhem.com](https://www.battle-of-arnhem.com/john-frosts-battalion-captures-the-rhine-bridge-but-not-the-railway-bridge-and-the-ship-bridge/) |
| Heveadorp ferry | Usable crossing | Disabled by the ferryman on 20 Sep; gone when the Poles arrived | [Liberation Route](https://france.liberationroute.com/pois/657/the-driel-ferry-disabled-for-the-germans-and-unusable-for-the-poles) |
| Kampfgruppe Harder | Counter-attacked the Arnhem bridge | Part of KG Spindler, split off on 18 Sep, held Oosterbeek station to the Rhine | [Battle of Arnhem](https://en.wikipedia.org/wiki/Battle_of_Arnhem) |
| Kampfgruppe Knaust | Arrived 19 Sep with armour | Arrived about 04:00 on 18 Sep with 8–10 old Panzer III/IV | [Weapons and Warfare](https://weaponsandwarfare.com/?p=19638) |
| Tigers | sPzAbt 506 from 20 Sep | First Tigers (Kompanie Hummel) on 19 Sep; sPzAbt 506 only from the night of 23/24 Sep | [506th Heavy Panzer Battalion](https://en.wikipedia.org/wiki/506th_Heavy_Panzer_Battalion) |
| Groesbeek attacks | KG Becker on 20 Sep | Korps Feldt (406th Division) on 18 Sep; II. Fallschirmkorps with four Kampfgruppen on 20 Sep | [Warfare History Network](https://warfarehistorynetwork.com/article/u-s-82nd-airborne-division-mook-holland-operation-market-garde/) |
| Arnhem bridge guard | Light infantry unit | Only a few bridge keepers; no unit ordered there until Brinkmann late on 17 Sep | [battle-of-arnhem.com](https://battle-of-arnhem.com/?p=987) |
| 1st Airlanding Brigade | One brigade unit | Three battalions; 2 S Staffords split across two lifts | [1st Airlanding Bde report](https://vriendenairbornemuseum.nl/public/1Airborne_Division_Report_on_Operation_Market_partIV_annexO2_1AirLBdeOCR.pdf) |
| Guards Armoured arrival | 19 Sep 10:00 at the south edge | Household Cavalry at Grave 08:20, Grenadier Group about 10:00; first Nijmegen attack 15:15 | [US Army CMH, ch. 7](https://www.ibiblio.org/hyperwar/USA/USA-E-Siegfried/USA-E-Siegfried-7.html) |
| Nijmegen road bridge | Taken about 19:00 | About 19:10–19:15; demolition withheld by Model | [US Army CMH, ch. 8](https://www.ibiblio.org/hyperwar/USA/USA-E-Siegfried/USA-E-Siegfried-8.html) |
| 4th Dorsets | 214th Brigade | 130th Brigade | [battle-of-arnhem.com](https://www.battle-of-arnhem.com/attack-by-the-4th-dorsets-on-the-westerbouwing-in-oosterbeek-ends-in-a-fiasco) |
| Supply drops | 80 % success in good weather | About 2–14 % per day reached the troops; most zones German-held | [Legion Magazine](https://legionmagazine.com/airmen-over-arnhem/) |
| Unit symbols | NATO symbols | NATO frames are post-war; use 1943 FM 21-30 conventional signs | [FM 21-30 (1943)](https://patcosta.com/wp-content/uploads/2026/05/FM-21-30-Conventional-Signs-Military-Symbols-and-Abbreviations-Oct-1943-.pdf) |
| Game clock | No time zone | British time (UTC+1); German/Dutch clocks one hour ahead until 2 Oct 1944 | [timeanddate](https://www.timeanddate.com/time/change/uk/london?year=1944) |
| Map grid | Generic 1 km grid | Nord de Guerre grid on GSGS 2541 (1:100,000) and GSGS 4427 (1:25,000) sheets | [Library of Congress](https://www.loc.gov/item/2003630738/) |

### 14.2 Confirmed

Landing and drop zones S, Z, X, Y, L, V, O, N and T; Frost at the bridge around 20:00 on 17 Sep with about 740 men; the 504th Waal crossing at 15:00 on 20 Sep; XXX Corps starting at 14:35 from Joe's Bridge; routes Leopard (1 Para Bn), Tiger (3 Para Bn) and Lion (2 Para Bn); "Club Route" as the XXX Corps axis; "Market" = airborne, "Garden" = ground; "The Island" for the Betuwe; Guards battlegroup pairings; 10th SS using the Pannerden ferry; Operation Berlin on the night of 25 September.

### 14.3 Design decisions on unresolved points

These points were not settled by sources. The decisions below are final for version 1.0; they can be revised if better evidence turns up.

| Open point | Decision |
| --- | --- |
| Ranks and first names of Krafft, Harder and Henke | Show surname only, with rank only where sources agree: "SS-Sturmbannführer Krafft", "Kampfgruppe Harder", "Oberst Henke". No first names in the game. |
| Kampfgruppe Melitz (Nijmegen) | Left out. Its men are folded into Kampfgruppe Henke. |
| 1 Border landing zone on 17 Sep | LZ S, then moves to guard the zones at Renkum and Heelsum (scenario script). |
| 456th Parachute Field Artillery Bn | Not in the vertical slice. In the full campaign it arrives with the 23 September glider lift. |
| Panthers at Elst | Not used. German armour on the Island is Panzer IV (10th SS) and, from 24 September, King Tigers of sPzAbt 506. |
| Nebelwerfers | One German rocket-launcher battery (artillery type, range 8 hexes) joins the Arnhem–Oosterbeek fighting from 20 September. |
| Time zones in German sources | All game times are stored in British time (UTC+1). Times taken from German sources are converted by subtracting one hour. |
| Weather 20–25 Sep | 20 Sep Overcast; 21 Sep Rain; 22 Sep Rain (no air operations); 23 Sep Overcast (break, air operations possible); 24 Sep Rain (no air operations); 25 Sep Overcast, Rain from 21:00. |
| Overall resupply recovered | Debrief uses "about 7 %" of all resupply reaching 1st Airborne. |
| Print-source cross-check | Online sources are accepted for development. A check against Middlebrook, Kershaw and the 1st Airborne Division report is a task in milestone M8, before the Steam release. |

### 14.4 How the team uses history

- All historical facts live in `docs/history/` as one markdown file per topic (British forces, US forces, German forces, timeline, weather, terminology), each fact with a source link.
- Scenario JSON values (units, times, zones) must match those files. A unit test compares the scenario timeline with `docs/history/timeline.md` for drift.
- Any new historical detail needs a source before it enters the game; unsure facts get `TODO(history)`.
- Content rule: Balkenkreuz yes; swastika and SS runes no, including in Germany (§86a StGB). This is a design rule, not legal advice; confirm with a games lawyer before release.
