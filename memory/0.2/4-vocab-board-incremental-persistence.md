# Vocab Board Incremental Persistence

Status: implemented in this branch.

The vocab board previously saved by deleting all `vocab_cards` and `vocab_columns` for the user, then inserting the full incoming board again. That made small edits expensive and regenerated database IDs.

The persistence contract now keeps `PUT /api/user/vocab-board` as a full-board request from the client, but the server diffs that board against Supabase rows and only inserts, updates, or deletes changed rows. Client-created cards and columns use `crypto.randomUUID()` so database IDs can remain stable across saves. Legacy local-storage IDs that are not UUIDs are accepted as a migration fallback: the server inserts UUID-backed rows and returns the normalized board, and the client adopts that returned board when the request is still current.

Next recommended step: if Vocab grows much larger, consider action-specific PATCH endpoints for card edits and moves to reduce request payload size as well as database writes.
