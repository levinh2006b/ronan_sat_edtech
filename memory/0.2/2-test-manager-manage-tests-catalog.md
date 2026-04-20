# Test Manager Manage Tests Catalog

## Status

- In progress: add a `Manage Tests` catalog surface to the test-manager page.

## Scope

- Add a header action on the test-manager screen that opens a workbook-style management dialog.
- Show a paginated table of public-test questions with basic metadata for admins who can edit public exams.
- Support searching by test title, passage text, option text, and numeric question number.
- Support explicit sort modes so large catalogs stay navigable without loading the full detailed dataset into the client.

## Notes

- The UI should reuse the existing workbook modal, table, input, and themed select primitives.
- The catalog should stay separate from the normalized reported-question inbox so admins can browse the broader public-test inventory directly.
