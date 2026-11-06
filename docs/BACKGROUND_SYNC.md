# Background account checks

Development change, 6 November 2026. No migrations, keys or hosted settings change.

Student practice keeps its 15-second interval while visible. Hidden tabs skip
idle account/history checks. Waiting uploads in any subject or practice mode
still trigger validation and upload retries; hidden uploads do not download
remote history. Pending/rejected metadata and logout warnings are unchanged.
Browser scheduling can still throttle or suspend a background tab.

Returning to the tab starts account validation and history sync. Paired focus and
visibility events are coalesced, while another genuine hide/return cycle always
checks again. If a check was already in flight, a fresh check follows it before
history resumes. Revoked, inactive or password-gated accounts retain the existing
sign-in gate. Offline account practice retains its existing cached-data policy.

Staff checks keep the 30-second interval while visible and pause while hidden.
Returning refreshes account and class/subject scope. Relevant staff actions still
reload their data; periodic scope refreshes are retained to detect revoked class
access while a report is open. Unchanged scope does not rebuild the dashboard.

Staff validation requests the profile and verified Auth user together, avoiding
the second `getUser` call previously used only to obtain the identity label.
The verified user object is returned to that caller, not added to the profile
cache. Supabase's authentication refresh configuration is unchanged.

`npm run test:background` checks idle request counts, hidden pending uploads,
return during an in-flight check, fresh return validation, staff identity reuse,
revocation, storage pressure and rejected attempts with local fictional fixtures.
These cases also run within the disposable account integration suite.
