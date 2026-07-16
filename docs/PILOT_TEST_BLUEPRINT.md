# UBL Closed Pilot Blueprint

## What this proves

The pilot proves that the commissioner can change game information, coaches can submit final scores, the commissioner can correct a result, and the website can receive real season scores automatically. Pilot games remain private and never affect the public schedule, standings, ticker, or brackets.

## Who does what

- **Andy:** updates one pilot game, then corrects one submitted pilot score.
- **Nick:** submits the King's School pilot score and verifies each step.
- **Chris:** submits the Wilton Baptist pilot score.

No meeting is required. Each person can complete their step on a different day.

## The five-step pilot

1. Nick confirms that Andy and Chris can open their assigned workbook.
2. Andy opens the control panel, unhides `Games`, finds `pilot-kings-01`, and changes its time from `6:00 PM` to `6:30 PM`.
3. Nick opens the coach portal, finds the first `PILOT TEST` row, enters `48` away, `52` home, his full name, and checks `Submit`.
4. Chris opens the coach portal, finds `pilot-wilton-01`, enters `61` away, `57` home, his full name, and checks `Submit`.
5. Andy returns to `Games`, changes the first pilot result from `48-52` to `49-52`, and adds `Pilot correction test` to Notes.

## What success looks like

- The coach portal says `Pilot complete - private` for both submissions.
- `Games` contains the submitted and corrected pilot scores.
- `Score Audit` contains both coach submissions.
- No `PILOT TEST` game appears on the public site.
- Each participant replies with either `Worked` or the exact step that was confusing.

## Links

- [Commissioner control panel](https://docs.google.com/spreadsheets/d/1AVo5oRxSCFuTrkCK4MA30vT5u_6XuLAXIvyaqnWgcRE/edit)
- [Coach score portal](https://docs.google.com/spreadsheets/d/1DScan6FYWXM8w6pmsj6d5jh6CLaoheWl4nKoKscAe-M/edit)
- [Public schedule](https://nickblanchard04.github.io/upstate-basketball-league/schedule.html)
- [Public standings](https://nickblanchard04.github.io/upstate-basketball-league/standings.html)

## Copy-and-send messages after they agree

Send these separately so each person receives only the link and instructions they need.

### Message to Andy

Subject: Your UBL commissioner pilot step

Hi Andy,

The private UBL pilot is ready. We do not need to meet or be online at the same time.

Open the commissioner control panel, unhide `Games`, find `pilot-kings-01`, and change the time from 6:00 PM to 6:30 PM. Then reply `Worked` or tell me the exact step that was confusing. After I submit that game's test score, I will send you the one correction step.

Commissioner control panel: https://docs.google.com/spreadsheets/d/1AVo5oRxSCFuTrkCK4MA30vT5u_6XuLAXIvyaqnWgcRE/edit

This test row is private and cannot appear on the public website.

Thanks,
Nick

### Message to Chris

Subject: Your UBL coach score pilot step

Hi Chris,

The private UBL pilot is ready. We do not need to meet or be online at the same time.

Open the coach score portal, find `pilot-wilton-01` at the top under `PILOT TEST`, enter 61 for the away score and 57 for the home score, enter your full name, and check `Submit`. Then reply `Worked` or tell me the exact step that was confusing.

Coach score portal: https://docs.google.com/spreadsheets/d/1DScan6FYWXM8w6pmsj6d5jh6CLaoheWl4nKoKscAe-M/edit

This test score is private and cannot appear on the public website. I will grant access to the Google email address you want to use before your test.

Thanks,
Nick

## Cleanup

After all replies are received, the site administrator verifies the audit, runs `clearPilotTestGames`, and confirms the public site still contains only season games.
