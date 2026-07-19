# UBL Team Photo Upload and Moderation

Each team has a dedicated Google Form containing one required file-upload question. Google stores those responses in that team's private `Pending Photos` folder. The upload links are distributed privately to team representatives and are not published on the UBL website.

## Submission requirements

Configure every team form to:

- Require Google sign-in
- Accept image files only
- Limit the number and size of uploaded files
- Collect the responder's email address
- State that submitting confirms permission to share the photos

## Review process

1. Run `syncGalleryModerationDashboard` or open the private `Gallery Moderation` tab after its scheduled refresh.
2. Review the thumbnail, filename, team, division, uploader metadata, and duplicate status.
3. Confirm the photo is UBL-related and may be published, especially when a student-athlete is identifiable.
4. Select the correct division. Single-division programs are filled automatically.
5. Choose `Approve` or `Reject` in `Decision`.
6. Approval moves the file into the matching Approved folder, gives that file public view access, and refreshes the gallery cache.
7. Rejection keeps the file private and moves it into the private `UBL Rejected Gallery Uploads` archive.

The dashboard blocks exact file duplicates using a SHA-256 content fingerprint. It cannot reliably detect different crops, screenshots, or visually similar photos, so the reviewer still checks near-duplicates manually.

Run `installGalleryModerationAutomation` once as the league business account to create the dashboard and its owner-run edit trigger. Pending folders and rejected files remain private at all times.

## Removal requests

Send removal requests to Info.upstatebasketballleague@gmail.com. Remove the public image promptly while the request is reviewed.

## Publishing behavior

The public gallery refreshes from the approved-photo feed whenever the page loads. Feed failures leave the bundled gallery photos in place. Team upload form links, moderation rows, uploader metadata, fingerprints, and private Drive folder links must not be committed to the public website repository.
