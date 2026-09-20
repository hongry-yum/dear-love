# Dear Love — notes for Claude

## Testing accounts

Do not sign up throwaway accounts for manual/Playwright testing. Use only:

- `test001`, `test002`, `test003`, `test004`, `test005`
- password for all of them: `asdf1234`

These are the only accounts that should exist in the database besides `admin`.
If a test needs more than one account (e.g. a partner pair), pick two of the
five — don't create new ones. Clean up any letters you create during a test
run (delete them) rather than leaving them in the database.
