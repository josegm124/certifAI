# Happy path

1. Open `/register` and create the unique organisation account.
2. At `/start`, enter the real AI-system name and select Tier 1 or Tier 2.
3. Answer every question in a domain. Moving to the next domain saves that
   complete block to SQLite; a failed save blocks navigation.
4. Repeat for all 9 domains. Reloading or logging in from another browser
   recovers the saved answers with `/api/assessments/active`.
5. Review at `/results` and finalize. Tier 2 requires the signatory name and
   declaration; Tier 1 does not.
6. Confirm the result says `Backend score of record`. If an eligible Tier 2
   badge was issued, open `/verify/<token>` without logging in.
7. Return to the dashboard. The finalized assessment is historical and a new
   assessment can now be started.

Expected protections: direct `/assess` access without login redirects to
`/login`; fewer than 36 stored answers cannot finalize; arbitrary question IDs
are rejected; failed Q17/Q18/Q26 caps the level to Aware; Tier 1 never emits a
badge.
