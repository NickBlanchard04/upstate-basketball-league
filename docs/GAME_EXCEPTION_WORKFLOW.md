# UBL Game Exceptions And Corrections

Only the commissioner or system owner changes the protected `Games` table. Coaches submit routine final scores through the coach portal and report every exception to [info.upstatebasketballleague@gmail.com](mailto:info.upstatebasketballleague@gmail.com).

## Decision table

| Situation | Commissioner action | Public effect |
| --- | --- | --- |
| Postponed, new date unknown | Set `Status` to `Postponed`; keep the original Game ID; add a brief public note | Game remains listed but is excluded from upcoming/live logic |
| Rescheduled | Update Date, Time, and Venue ID; set `Status` back to `Scheduled` | Every schedule surface updates from the same row |
| Cancelled | Set `Status` to `Cancelled`; add a brief reason when appropriate | Game remains visible and does not affect standings |
| Forfeit | Confirm the ruling; enter the league-approved forfeit score; set `Status` to `Forfeit` | Result affects standings and the audit trail documents the ruling |
| Published score is wrong | Correct both score cells if needed; keep `Final`; update Last Updated; record the reason in Notes | Results, standings, and seeding recalculate |
| Wrong venue | Confirm the venue exists in `Venues`; update Venue ID once | Address and map links update everywhere |
| Duplicate submission | Do not create another game row; review `Score Audit`; leave the accepted final intact | No public change unless a correction is required |
| Unusual-score warning | Verify the score with the submitting representative; accept the coach's second confirmation or enter a commissioner correction | Prevents likely typing mistakes without blocking legitimate results |
| Result or eligibility dispute | Leave the game non-final or temporarily return it to `Scheduled`; keep private details outside public Notes | Standings remain unchanged until the commissioner rules |
| Live feed unavailable | Use the control sheet as the source of truth; do not re-enter games or scores | Website displays its last safe backup and sync warning |

## Required correction record

For every commissioner correction, preserve the existing Game ID and record:

- who requested the correction
- the prior score or status
- the approved score or status
- a short operational reason
- the time the change was made

Never delete a game row to fix a mistake. Never publish private disciplinary, medical, or eligibility information in `Notes`.

## Verification after any exception

1. Confirm the row in `Games` is internally consistent.
2. Confirm the `Website Feed` row matches the intended public information.
3. Refresh the public schedule and standings.
4. For a final or forfeit, verify both playoff brackets.
5. Review `Score Audit` and preserve any supporting league communication.
