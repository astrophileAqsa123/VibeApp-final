# Baseline (before Phase 1)

Command: `node --test test/*.test.js` (Node v22.23.4)
Note: `npm test` fails on Node 22 (`--test-isolation=none` needs Node 24+). Use the command above, or upgrade Node.
`npm run check`: Syntax OK, 77 files.

Result: 149 tests, 130 pass, 19 fail.

## Failing tests at baseline

### Seed-data / semantic generation (Phase 1-2 targets)
- 128 compiled apps never ship placeholder sample data (North/Central/West, 'Notes sample for ...') - placeholder data in "student management system"
- 132 the head noun decides the record type ('Seller Order' is an order, not a company) - undefined string argument
- 133 seedValue stays available and returns semantic values - assertion
- 134 provider failure during seed generation still yields realistic data - assertion
- 137 acronym entity names produce clean identifiers - got `sLapolicy` (expected clean id for "SLA policy")
- 87 student template generates a complete product shell - assertion (investigate)
- 88 Supabase generation receives the same product shell - assertion (investigate)

### Edit pipeline / token limits (Phase 4-5 targets; need functions not yet implemented)
- 6 applyPatch does not expand $-patterns from replacement text
- 7 an ambiguous find patches the occurrence inside the shown block
- 8 several patches apply in order and report failures separately - `applyPatches is not a function`
- 9 parsePatches accepts patch lists ... - `parsePatches is not a function`
- 10-13, 15 groq diff edit tests - fail with GROQ_API_KEY missing (tests expect mocked client)
- 14 a patch that would unbalance the file is rejected - instanceof error
- 17 a large app's edit request fits where the full spec would not - request 8581 chars
- 20 planner edits retry with a smaller view - `maxTokens` of undefined

# After Phase 1

Command: `node --test test/*.test.js`: 155 tests, 139 pass, 16 fail (was 130 pass / 19 fail at 149 tests; 6 new tests added in test/seedQuality.test.js).
`npm run check`: Syntax OK, 77 files.

Fixed by Phase 1: 128 (placeholder data), 133 (seedValue semantic), 134 (provider failure still realistic).
Still failing, owned by later phases:
- Phase 2: 132 (seller has no email field; workspace fields still generic title/date/status/notes), 137 (`sLapolicy` id).
- Phase 4-5: 6-15, 17, 20.
- Unrelated to seed data: 87, 88 (expect NavigationDestinationLabelBehavior.onlyShowSelected in the product shell).
