# Fictional class week — connected development database

These are operator-run database fixtures, not changes to the isolated HTML
preview and not an automatically applied migration. No hosted accounts have been
modified by preparing/testing these files. Staff accounts are never renamed.

## Apply using Supabase SQL Editor

Use the same development Supabase project, with migrations 001–015 already
installed. The operator must confirm every existing student account is fictional,
as authorised for this demonstration. The supplied read-only plan lists them.

1. Open `supabase/operator/fictional-students-plan.sql`, copy Raw SQL into a new
   query and run it. Keep the results privately; account IDs/usernames are not
   intended for a public repository.
2. For a full class, use the existing connected staff dashboard to generate
   enough test students to reach **12 accounts** (six is the minimum required by
   the seed). Use one of your test classes for creation. Do not use the isolated
   showcase: its Generate button cannot create hosted accounts. The connected
   `staff-preview.html` supports real staff sign-in if development isn't hosted.
3. Sign out student test browsers. Run the **whole**
   `supabase/operator/rename-fictional-students.sql` in a new query, including
   begin/commit. This renames all student profiles and their internal Auth email
   identifiers, updates email identities and revokes student sessions. It returns
   the old → new mapping, for example `fictional-bear`. Passwords, account UUIDs,
   result history, staff records and existing memberships remain unchanged. Old
   usernames stop working. Use the new username with the existing password, or
   ask the teacher to reset it normally.
4. Run the **whole** `supabase/operator/seed-fictional-week.sql` in another query.
   It validates the current question catalogue and requires every student to
   have the fictional prefix. It creates two labelled classes: **Fictional
   Chemistry — example week** and **Fictional Applied Science — example week**,
   enrolling all current students in both without removing their old memberships.
5. Sign in to the connected development administrator dashboard, refresh, select
   each subject and the Fictional class, and open student reports. Assign a
   teacher to the fictional classes and relevant subjects using normal admin
   controls if you want to demonstrate teacher views too. No staff permissions
   are silently granted by the scripts.

These writes affect any site using this same Supabase project, including a main
site if it connects there. Git main is unchanged. No service key or database
password needs to be shared in chat. If a query fails, stop and send its error,
not credentials. Run when test users are not actively practising/resetting.

## What is generated

Six behaviours repeat across the class (ordered by fictional username): regular
strong recall; regular improving marks; selective practice in two topics;
frequent practice needing support with reveals/retries; a single recent burst;
and no practice. Several topics are revisited across days, others remain new.
The SQL returns each student's scenario and number of generated encounters.

The sample covers seven days ending recently. Its anchor is stored in the
fictional class's creation time; rerunning does not move the week or duplicate
its events. The anchor is deliberately backdated for this fictional fixture.
The date range returned by the script shows which week is represented. Over
subsequent days ratings decay naturally; this is not a permanent frozen chart.
Ask for a controlled fixture refresh if you later need a different week.

Actual first-sign-in, last-sign-in, password-change gates, account active state
and retention settings are preserved, not forged. An unused account may show
Not yet for sign-in despite its synthetic practice events. These are clearly
labelled demonstration accounts, not evidence of actual sign-ins. Newly generated
accounts still require their own password change; do not distribute them as real
student accounts before approval.

Existing published flashcard packs are used for synthetic recall records (up to
two packs per subject and four current cards per pack). No packs are created,
edited, published or archived. If no packs are published, flashcard reports stay
empty until a pack is published through the normal staff workflow and the seed
is rerun. Question histories and flashcard self-assessments remain separate.

Existing results are not erased; reports combine earlier test history with the
new sample, so exact ratings may differ from a clean fixture.

All A–E ratings use the real algorithm from synthetic mark metadata; no grades
are hard-coded. In particular, one-day bursts cannot earn A/B and retries/reveals
do not inflate unaided evidence. There are no retained selected answers or free
text in the synthetic attempt records.

## Safety and repeatability

The rename is one transaction. It temporarily replaces the identity-protection
function only inside that transaction, allows only the exact mapped synthetic
email changes, and restores the original function definition before committing.
An error rolls everything back. No persistent rename bypass or new public RPC is
installed. Ordinary account identity-change protection remains intact.

Already-fictional names remain stable; collisions with occupied Auth addresses
are skipped and alphabetic suffixes provide more names than the animal list.
Seeding uses deterministic event/class IDs; reruns do not erase existing records
or create duplicate marks. Ordinary new student generation remains unchanged for
future real accounts. If you create further test accounts, rerun rename before
seeding them. Do not run this bulk rename after real accounts are introduced.

For eventual cleanup, review the `fictional-` accounts and delete confirmed test
accounts through existing administrator controls. Their account data cascades
normally. Classes/packs are shared teaching material and have separate lifecycle
handling; do not delete genuine teaching content when clearing test results.

## Maintaining and testing

`node scripts/build-fictional-week.cjs` regenerates the seed from the development
question banks; only metadata/catalogue IDs and maximum marks are included.
The template is `supabase/operator/seed-fictional-week.template.sql`.
`tests/fictional-week-integration.cjs` runs only on the disposable local stack and
is included in `npm run test:auth-local`. It checks stable renames, working login
with the unchanged password, restored identity protection, preserved user IDs,
repeatable question/flashcard seeding, seven-day timestamps and actual rating
caps. No hosted execution or account changes are claimed by those checks.

Verified locally with 12 Auth accounts: renamed names remain stable, original
password hashes and an existing attempt survive, original password login still
works, ordinary identity changes remain blocked, two classes are created, and
repeated seeding preserves event counts. The clean sample generated 724 question
events for ten active students (two had no practice), plus flashcard assessments
when a published local test pack was present. Strong spaced evidence produced A;
a one-day burst did not produce A/B. The maintained 308 software checks and 54
Node unit tests also passed. No hosted changes were made by this verification.
