# UBL Closed Pilot

This is the only pilot instruction set. The test is asynchronous: Andy, Nick, and Chris may complete their steps on different days. No meeting is required.

## What the pilot proves

1. A commissioner schedule change reaches the correct team portal.
2. A designated team representative can submit a final score.
3. A representative can request a correction without editing league data directly.
4. The commissioner can approve that correction through an audit trail.
5. Pilot records never appear on the public website.

## Private links

- **Commissioner control panel:** <https://docs.google.com/spreadsheets/d/1AVo5oRxSCFuTrkCK4MA30vT5u_6XuLAXIvyaqnWgcRE/edit>
- **King's portal:** <https://docs.google.com/spreadsheets/d/1DScan6FYWXM8w6pmsj6d5jh6CLaoheWl4nKoKscAe-M/edit>
- **Wilton portal:** <https://docs.google.com/spreadsheets/d/1uc3CNuza7KnLN49RfA6IHA532Lj-hGu0W6WVnyeWzy4/edit>

Use the commissioner link only with the league account. Send each representative only their own team portal.

## Exact sequence

1. Nick confirms both participants have agreed and can open their assigned links.
2. Andy opens `Commissioner Dashboard`, finds `pilot-kings-01`, and changes the time from `6:00 PM` to `6:30 PM`.
3. Andy replies `Andy schedule step complete` or identifies the confusing step.
4. Nick confirms that the King's portal now shows `6:30 PM`.
5. Nick enters `48` away and `52` home for `pilot-kings-01`, then checks `Submit`.
6. Chris enters `61` away and `57` home for `pilot-wilton-01`, then checks `Submit`.
7. Nick opens `Correction Request`, requests `49` away and `52` home for `pilot-kings-01`, enters `Pilot correction test`, and checks `Submit`.
8. Andy opens `Corrections Queue` and changes the open request to `Approved`. The system changes it to `Completed` after applying the result.
9. Each participant replies `Worked` or names the exact step that was unclear.
10. The system owner verifies the audit and public isolation, then runs `clearPilotTestGames`.

Nick's score submission should follow Andy's schedule change so portal synchronization is tested. Chris may complete his independent step at any time.

## Message to send after Andy agrees

**Subject:** UBL private score-system pilot instructions

Hi Andy and Chris,

Thank you for helping test the UBL score system. We do not need to meet or be online at the same time. Each step can be completed on a different day.

Andy: Sign into the league account, open the Commissioner Dashboard, find `pilot-kings-01`, and change the time from 6:00 PM to 6:30 PM.

Commissioner control panel:

<https://docs.google.com/spreadsheets/d/1AVo5oRxSCFuTrkCK4MA30vT5u_6XuLAXIvyaqnWgcRE/edit>

Chris: Sign into your verified Google account, open the Wilton portal, find `pilot-wilton-01`, enter 61 as the away score and 57 as the home score, and check Submit.

Wilton portal:

<https://docs.google.com/spreadsheets/d/1uc3CNuza7KnLN49RfA6IHA532Lj-hGu0W6WVnyeWzy4/edit>

I will complete the King's representative step after Andy confirms the schedule change. These private test records cannot appear on the public website.

When finished, reply `Worked` or tell me the exact step that was confusing.

Thanks,

Nick

## Correction message to Andy

**Subject:** UBL pilot correction ready for approval

Hi Andy,

The pilot correction is ready. Open the UBL control panel, select `Corrections Queue`, find the open request for `pilot-kings-01`, and change its status to `Approved`. The system should apply the corrected score and change the request to `Completed`.

Please reply `Correction complete` or tell me the exact step that was confusing.

Thanks,

Nick

## Pass criteria

- Both portal submissions report `Pilot complete - private`.
- The corrected result is `49-52` in the private Games table.
- `Score Audit` contains the submissions and approved correction.
- `Corrections Queue` shows `Completed`.
- The public JSON feed and Website Feed contain zero pilot records.
- No real season result, standing, ticker item, or bracket seed changes.

## Do not

- Do not use a real season game.
- Do not manually edit the public website.
- Do not give a representative access to the control panel or another team's portal.
- Do not correct a result directly in the dashboard during the pilot.
- Do not delete pilot rows before checking the audit trail and public isolation.
