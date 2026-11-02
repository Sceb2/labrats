# Electricity topic regrouping

The ten selectable topic names and explicit question memberships are authored in `applied-science/electricity-topics.json`. The approved Electricity source bank is grouped to match them, and the production builder writes the same assignments to the live bank and lesson map. Question IDs, content versions, prompts, answers, tolerances and marking rules are retained. Existing results and A–E ratings remain applicable. Removed lesson IDs in saved selection preferences are mapped to their nearest retained category.

| Topic | Questions |
|---|---:|
| Circuit Components | 15 |
| Electrical Quantities | 7 |
| Potential Difference and Current | 13 |
| Resistance and Ohm's Law | 23 |
| Thermistors | 4 |
| LEDs and LDRs | 6 |
| Electrical Energy | 22 |
| Changes of State | 6 |
| Specific Heat Capacity | 15 |
| Specific Latent Heat | 9 |

## Borderline placements

- Power, appliance ratings, costs and fuse-current calculations (E068–E089, except E088): Electrical Energy. E018 and E088 test fuse function/operation and sit under Circuit Components.
- Ordinary diode questions: Circuit Components. LED-specific questions: LEDs and LDRs. Lamp current–voltage behaviour: Resistance and Ohm's Law.
- E019 tests thermal units for both heat capacity and latent heat; Specific Heat Capacity is its primary home.
- E020 compares specific heat capacity and latent heat; placed under Changes of State as a bridge between the thermal topics.
- E090–E092 cover temperature scales/rises; placed under Specific Heat Capacity as supporting knowledge.
- E103 includes both warming ice and melting it; placed under Specific Latent Heat because its final calculation combines sensible and latent heating.
- E109 is general electrical measurement/anomaly work, placed under Potential Difference and Current.

## Supabase

Apply `supabase/migrations/202611020012_electricity_topic_groups.sql` after migration 011. It updates only the catalogue's topic arrays for the 120 existing Electricity identities. It does not insert/delete attempts, alter marks, change account permissions or require an Edge Function deployment. Saving attempts continues to use the same already-registered identities; the migration aligns database-based topic reporting with the new picker.
