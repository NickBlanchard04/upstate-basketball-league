window.UBL_DATA = {
  season: "2026–27",
  divisions: ["Boys Varsity", "Girls Varsity"],
  scheduleNotice: "League dates, matchups, times, and locations are planning placeholders until confirmed by team representatives.",
  programs: [
    {
      id: "kings-school",
      name: "The King’s School",
      short: "TKS",
      logo: "../assets/team-kings-school.png",
      type: "School-based program",
      divisions: ["Boys Varsity", "Girls Varsity"],
      homeGym: "The King’s School Gym",
      representativeEmail: "athletic_director@kingsschool.info",
      summary: "A founding UBL program fielding both boys and girls varsity teams.",
      teams: {
        "Boys Varsity": {
          headCoach: "Hudson Waters",
          assistants: ["Jacob Fischer — Assistant Coach, Class of 2022 alumnus"],
          notes: "Hudson Waters enters his second season as head coach."
        },
        "Girls Varsity": {
          headCoach: "Brodie Farr",
          assistants: ["Todd Brown — Assistant Coach"],
          notes: "Brodie Farr, Class of 1992 alumnus, and Todd Brown have coached together for four seasons."
        }
      }
    },
    {
      id: "perth",
      name: "Perth",
      short: "PER",
      logo: "../assets/team-perth.png",
      type: "Independent program",
      divisions: ["Boys Varsity", "Girls Varsity"],
      homeGym: "To be confirmed",
      representativeEmail: "",
      summary: "A founding UBL program with boys and girls varsity participation planned.",
      teams: {
        "Boys Varsity": { headCoach: "To be confirmed", assistants: [], notes: "Additional program information is being collected." },
        "Girls Varsity": { headCoach: "To be confirmed", assistants: [], notes: "Additional program information is being collected." }
      }
    },
    {
      id: "wilton-baptist",
      name: "Wilton Baptist",
      short: "WBC",
      logo: "../assets/team-wilton-baptist.png",
      type: "School-based program",
      divisions: ["Boys Varsity", "Girls Varsity"],
      homeGym: "To be confirmed",
      representativeEmail: "",
      summary: "A founding UBL program led by coach Chris Webster.",
      teams: {
        "Boys Varsity": { headCoach: "Chris Webster", assistants: [], notes: "Roster and assistant-coach information are being collected." },
        "Girls Varsity": { headCoach: "Chris Webster", assistants: [], notes: "Roster and assistant-coach information are being collected." }
      }
    },
    {
      id: "hv-rocks",
      name: "HV Rocks",
      short: "HVR",
      logo: "../assets/team-hudson-valley-rocks.png",
      type: "Independent boys program",
      divisions: ["Boys Varsity"],
      homeGym: "Hudson Valley home gym — to be confirmed",
      representativeEmail: "",
      summary: "A boys varsity program operated separately from the HV Flames girls program.",
      teams: {
        "Boys Varsity": { headCoach: "Marc Bailey", assistants: [], notes: "Additional program information is being collected." }
      }
    },
    {
      id: "hv-flames",
      name: "HV Flames",
      short: "HVF",
      logo: "../assets/ubl-logo.png",
      type: "Independent girls program",
      divisions: ["Girls Varsity"],
      homeGym: "Hudson Valley home gym — to be confirmed",
      representativeEmail: "",
      summary: "A girls varsity program operated separately from the HV Rocks boys program.",
      teams: {
        "Girls Varsity": { headCoach: "Rebekah Johnson", assistants: [], notes: "Team logo and additional program information are being collected." }
      }
    },
    {
      id: "tbd",
      name: "TBD",
      short: "TBD",
      logo: "../assets/ubl-logo.png",
      type: "Future UBL program",
      divisions: ["Boys Varsity", "Girls Varsity"],
      homeGym: "To be confirmed",
      representativeEmail: "",
      summary: "Reserved for the fifth program in each UBL division.",
      teams: {
        "Boys Varsity": { headCoach: "To be confirmed", assistants: [], notes: "The fifth boys varsity program is being recruited." },
        "Girls Varsity": { headCoach: "To be confirmed", assistants: [], notes: "The fifth girls varsity program is being recruited." }
      }
    }
  ],
  standings: {
    "Boys Varsity": [
      { programId: "kings-school", wins: 0, losses: 0, pf: 0, pa: 0 },
      { programId: "perth", wins: 0, losses: 0, pf: 0, pa: 0 },
      { programId: "wilton-baptist", wins: 0, losses: 0, pf: 0, pa: 0 },
      { programId: "hv-rocks", wins: 0, losses: 0, pf: 0, pa: 0 },
      { programId: "tbd", wins: 0, losses: 0, pf: 0, pa: 0 }
    ],
    "Girls Varsity": [
      { programId: "kings-school", wins: 0, losses: 0, pf: 0, pa: 0 },
      { programId: "perth", wins: 0, losses: 0, pf: 0, pa: 0 },
      { programId: "wilton-baptist", wins: 0, losses: 0, pf: 0, pa: 0 },
      { programId: "hv-flames", wins: 0, losses: 0, pf: 0, pa: 0 },
      { programId: "tbd", wins: 0, losses: 0, pf: 0, pa: 0 }
    ]
  },
  scheduleWeeks: [
    {
      id: "opening-week",
      label: "Opening Week",
      range: "Dec 1–3",
      type: "regular",
      note: "Special Tuesday opening night followed by the first regular Thursday league date.",
      games: [
        { iso: "2026-12-01", date: "Tue Dec 1", time: "6:00 PM", division: "Boys Varsity", awayId: "wilton-baptist", homeId: "kings-school", location: "The King’s School Gym" },
        { iso: "2026-12-01", date: "Tue Dec 1", time: "7:30 PM", division: "Girls Varsity", awayId: "wilton-baptist", homeId: "kings-school", location: "The King’s School Gym" },
        { iso: "2026-12-03", date: "Thu Dec 3", time: "6:00 PM", division: "Boys Varsity", awayId: "perth", homeId: "hv-rocks", location: "Hudson Valley home gym — TBD" },
        { iso: "2026-12-03", date: "Thu Dec 3", time: "7:30 PM", division: "Girls Varsity", awayId: "perth", homeId: "hv-flames", location: "Hudson Valley home gym — TBD" }
      ]
    },
    {
      id: "week-2",
      label: "Week 2",
      range: "Dec 7–10",
      type: "regular",
      games: [
        { iso: "2026-12-07", date: "Mon Dec 7", time: "6:00 PM", division: "Boys Varsity", awayId: "kings-school", homeId: "perth", location: "Perth — TBD" },
        { iso: "2026-12-07", date: "Mon Dec 7", time: "7:30 PM", division: "Girls Varsity", awayId: "hv-flames", homeId: "wilton-baptist", location: "Wilton Baptist — TBD" },
        { iso: "2026-12-10", date: "Thu Dec 10", time: "6:00 PM", division: "Boys Varsity", awayId: "hv-rocks", homeId: "wilton-baptist", location: "Wilton Baptist — TBD" },
        { iso: "2026-12-10", date: "Thu Dec 10", time: "7:30 PM", division: "Girls Varsity", awayId: "perth", homeId: "kings-school", location: "The King’s School Gym" }
      ]
    },
    {
      id: "week-3",
      label: "Week 3",
      range: "Dec 14–17",
      type: "regular",
      games: [
        { iso: "2026-12-14", date: "Mon Dec 14", time: "6:00 PM", division: "Boys Varsity", awayId: "wilton-baptist", homeId: "perth", location: "Perth — TBD" },
        { iso: "2026-12-14", date: "Mon Dec 14", time: "7:30 PM", division: "Girls Varsity", awayId: "kings-school", homeId: "hv-flames", location: "Hudson Valley home gym — TBD" },
        { iso: "2026-12-17", date: "Thu Dec 17", time: "6:00 PM", division: "Boys Varsity", awayId: "kings-school", homeId: "hv-rocks", location: "Hudson Valley home gym — TBD" },
        { iso: "2026-12-17", date: "Thu Dec 17", time: "7:30 PM", division: "Girls Varsity", awayId: "wilton-baptist", homeId: "perth", location: "Perth — TBD" }
      ]
    },
    {
      id: "christmas-break",
      label: "Christmas Break",
      range: "Dec 21–Jan 1",
      type: "break",
      note: "No league games planned during The King’s School Christmas Break.",
      games: []
    },
    {
      id: "week-4",
      label: "Week 4",
      range: "Jan 4–7",
      type: "regular",
      games: [
        { iso: "2027-01-04", date: "Mon Jan 4", time: "6:00 PM", division: "Boys Varsity", awayId: "perth", homeId: "kings-school", location: "The King’s School Gym" },
        { iso: "2027-01-04", date: "Mon Jan 4", time: "7:30 PM", division: "Girls Varsity", awayId: "hv-flames", homeId: "kings-school", location: "The King’s School Gym" },
        { iso: "2027-01-07", date: "Thu Jan 7", time: "6:00 PM", division: "Boys Varsity", awayId: "wilton-baptist", homeId: "hv-rocks", location: "Hudson Valley home gym — TBD" },
        { iso: "2027-01-07", date: "Thu Jan 7", time: "7:30 PM", division: "Girls Varsity", awayId: "perth", homeId: "wilton-baptist", location: "Wilton Baptist — TBD" }
      ]
    },
    {
      id: "week-5",
      label: "Week 5",
      range: "Jan 11–14",
      type: "regular",
      games: [
        { iso: "2027-01-11", date: "Mon Jan 11", time: "6:00 PM", division: "Boys Varsity", awayId: "hv-rocks", homeId: "perth", location: "Perth — TBD" },
        { iso: "2027-01-11", date: "Mon Jan 11", time: "7:30 PM", division: "Girls Varsity", awayId: "kings-school", homeId: "wilton-baptist", location: "Wilton Baptist — TBD" },
        { iso: "2027-01-14", date: "Thu Jan 14", time: "6:00 PM", division: "Boys Varsity", awayId: "kings-school", homeId: "wilton-baptist", location: "Wilton Baptist — TBD" },
        { iso: "2027-01-14", date: "Thu Jan 14", time: "7:30 PM", division: "Girls Varsity", awayId: "perth", homeId: "hv-flames", location: "Hudson Valley home gym — TBD" }
      ]
    },
    {
      id: "midterm-week",
      label: "Midterm Week",
      range: "Jan 18–25",
      type: "break",
      note: "No league games currently planned during Martin Luther King Jr. Day and The King’s School midterm exam period.",
      games: []
    },
    {
      id: "week-6",
      label: "Week 6",
      range: "Jan 28",
      type: "regular",
      note: "League play resumes after midterm exams.",
      games: [
        { iso: "2027-01-28", date: "Thu Jan 28", time: "6:00 PM", division: "Boys Varsity", awayId: "perth", homeId: "wilton-baptist", location: "Wilton Baptist — TBD" },
        { iso: "2027-01-28", date: "Thu Jan 28", time: "7:30 PM", division: "Girls Varsity", awayId: "wilton-baptist", homeId: "hv-flames", location: "Hudson Valley home gym — TBD" }
      ]
    },
    {
      id: "week-7",
      label: "Week 7",
      range: "Feb 1–4",
      type: "regular",
      games: [
        { iso: "2027-02-01", date: "Mon Feb 1", time: "6:00 PM", division: "Boys Varsity", awayId: "hv-rocks", homeId: "kings-school", location: "The King’s School Gym" },
        { iso: "2027-02-01", date: "Mon Feb 1", time: "7:30 PM", division: "Girls Varsity", awayId: "hv-flames", homeId: "perth", location: "Perth — TBD" },
        { iso: "2027-02-04", date: "Thu Feb 4", time: "6:00 PM", division: "Boys Varsity", awayId: "wilton-baptist", homeId: "kings-school", location: "The King’s School Gym" },
        { iso: "2027-02-04", date: "Thu Feb 4", time: "7:30 PM", division: "Girls Varsity", awayId: "kings-school", homeId: "perth", location: "Perth — TBD" }
      ]
    },
    {
      id: "week-8",
      label: "Final Regular-Season Week",
      range: "Feb 8–11",
      type: "regular",
      note: "Final planned regular-season games before winter break and the postseason.",
      games: [
        { iso: "2027-02-08", date: "Mon Feb 8", time: "6:00 PM", division: "Boys Varsity", awayId: "perth", homeId: "hv-rocks", location: "Hudson Valley home gym — TBD" },
        { iso: "2027-02-08", date: "Mon Feb 8", time: "7:30 PM", division: "Girls Varsity", awayId: "wilton-baptist", homeId: "kings-school", location: "The King’s School Gym" },
        { iso: "2027-02-11", date: "Thu Feb 11", time: "6:00 PM", division: "Boys Varsity", awayId: "hv-rocks", homeId: "wilton-baptist", location: "Wilton Baptist — TBD" },
        { iso: "2027-02-11", date: "Thu Feb 11", time: "7:30 PM", division: "Girls Varsity", awayId: "perth", homeId: "hv-flames", location: "Hudson Valley home gym — TBD" }
      ]
    },
    {
      id: "playoff-week",
      label: "Playoff Week",
      range: "Feb 15–18",
      type: "playoff",
      note: "Tentative postseason dates during winter break. Seed 4 plays Seed 5; the winner advances to play Seed 1.",
      games: [
        { iso: "2027-02-15", date: "Mon Feb 15", time: "6:00 PM", division: "Boys Varsity", awayName: "Seed 5", homeName: "Seed 4", location: "Play-in site — TBD", stage: "Play-in" },
        { iso: "2027-02-15", date: "Mon Feb 15", time: "7:30 PM", division: "Girls Varsity", awayName: "Seed 5", homeName: "Seed 4", location: "Play-in site — TBD", stage: "Play-in" },
        { iso: "2027-02-18", date: "Thu Feb 18", time: "5:00 PM", division: "Boys Varsity", awayName: "Play-in winner", homeName: "Seed 1", location: "Semifinal Site A — TBD", stage: "Semifinal" },
        { iso: "2027-02-18", date: "Thu Feb 18", time: "5:00 PM", division: "Girls Varsity", awayName: "Play-in winner", homeName: "Seed 1", location: "Semifinal Site B — TBD", stage: "Semifinal" },
        { iso: "2027-02-18", date: "Thu Feb 18", time: "7:00 PM", division: "Boys Varsity", awayName: "Seed 3", homeName: "Seed 2", location: "Semifinal Site A — TBD", stage: "Semifinal" },
        { iso: "2027-02-18", date: "Thu Feb 18", time: "7:00 PM", division: "Girls Varsity", awayName: "Seed 3", homeName: "Seed 2", location: "Semifinal Site B — TBD", stage: "Semifinal" }
      ]
    },
    {
      id: "championship-week",
      label: "Championship Night",
      range: "Feb 22",
      type: "playoff",
      note: "Tentative UBL championship date following winter break.",
      games: [
        { iso: "2027-02-22", date: "Mon Feb 22", time: "6:00 PM", division: "Girls Varsity", awayName: "Semifinal winner", homeName: "Semifinal winner", location: "Championship site — TBD", stage: "Championship" },
        { iso: "2027-02-22", date: "Mon Feb 22", time: "7:45 PM", division: "Boys Varsity", awayName: "Semifinal winner", homeName: "Semifinal winner", location: "Championship site — TBD", stage: "Championship" }
      ]
    }
  ]
};
