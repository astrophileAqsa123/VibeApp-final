# Relational generation contract

The multi-entity route uses AI to plan an AppSpec, semantic validation and an
explicit compiler capability audit, then the Flutter compiler. Existing preview
queue limits and per-session directories remain unchanged. Dependency detection
adds Hive only to the generated project's own pubspec.

## Implemented

- References retain their metadata across normalization; existing foreign-key
  fields become selectors. Explicit foreign keys require declared delete policies.
- One-to-many and many-to-many relations render in both directions on detail pages.
  Relationship attributes use editable join entities (for example project memberships).
- Calendar views configure an entity and date field. Budget views configure parent
  budget, child expenses, foreign key and amount. The same budget component appears
  on the dashboard and individual parent details.
- Search, ascending/descending sorting, field-value filters and date pickers.
- Delete preflight traverses cascades before mutating anything. Restrict checks
  incoming dependent records, not the child's parent. Required/unique/reference
  validation runs in the store as well as forms; record and link saves are grouped.
- Local mode stores serialized normalized records/links in Hive, backed by IndexedDB
  on web and local files on mobile. This is not a SQL database. Memory mode does not
  persist. Previous SharedPreferences data is migrated without deleting the old copy.
  Writes are serialized and the sequence counter survives reloads.
- AI samples are generated separately in small batches, with stable IDs and references
  supplied by code. Provider failure keeps valid generic samples and returns a warning.
- Edits use operations against the current saved spec. They cannot silently fall back
  to recreating the original request. Unsupported operations fail without saving a version.

## Boundaries

This is not an arbitrary-app guarantee. Custom workflows, business-rule engines,
multi-entity authentication and arbitrary custom screens are not compiled; the audit
rejects them. There is no verified AI custom-Dart extension stage yet. Flutter output
still uses one preview entrypoint, rather than a full multi-file clean architecture.
Fallback parsing understands a limited explicit Entities/Relationships format, not
unrestricted natural language. Unknown requirement clauses remain uncovered.
Schema/data migrations beyond adding seed-backed entities are not a general migration
engine. Persisted data should be reviewed when changing field types or relationships.

## Verification

- `npm test`: schema, planning, edit preservation, requirement omissions and dependency isolation.
- `npm run validate:multi`: builds the Film Production fixture in a temporary Flutter
  project, applies the actual preview sanitizer/dependencies, runs Flutter analysis,
  store/widget tests, and a release web build. Never uses an active preview workspace.

Live provider quality and simultaneous-browser load are separate integration tests;
passing the fixture does not prove every natural-language request is covered.
