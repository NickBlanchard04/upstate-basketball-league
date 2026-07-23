const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const canonicalBase = "https://upstatebasketballleague.com/";
const releaseToken = "20260723-1";
const socialImage = `${canonicalBase}assets/social/ubl-social-share.jpg`;
const socialAlt = "Upstate Basketball League mark beside an illustrated varsity basketball player preparing under arena lights";

const programs = [
  {
    id: "kings-school",
    name: "The King's School",
    short: "TKS",
    logo: "assets/optimized/team-kings-school-192.webp",
    summary: "A founding UBL program fielding both boys and girls varsity teams.",
    homeGym: "The King's School Gym",
    address: "",
    email: "athletic_director@kingsschool.info",
    teams: {
      boys: {
        division: "Boys Varsity",
        headCoach: "Hudson Waters",
        headCoachDetail: "Second season as head coach.",
        assistant: "Jacob Fischer",
        assistantDetail: "Assistant coach and Class of 2022 alumnus."
      },
      girls: {
        division: "Girls Varsity",
        headCoach: "Brodie Farr",
        headCoachDetail: "Class of 1992 alumnus; coached the program for four seasons.",
        assistant: "Todd Brown",
        assistantDetail: "Coached alongside Brodie Farr for four seasons."
      }
    }
  },
  {
    id: "perth",
    name: "Perth",
    short: "PER",
    logo: "assets/optimized/team-perth-192.webp",
    summary: "A founding UBL program with boys and girls varsity participation planned.",
    homeGym: "Perth home court",
    address: "",
    email: "",
    teams: {
      boys: { division: "Boys Varsity", headCoach: "", headCoachDetail: "", assistant: "", assistantDetail: "" },
      girls: { division: "Girls Varsity", headCoach: "", headCoachDetail: "", assistant: "", assistantDetail: "" }
    }
  },
  {
    id: "wilton-baptist",
    name: "Wilton Baptist",
    short: "WBC",
    logo: "assets/optimized/team-wilton-baptist-192.webp",
    summary: "A founding UBL program led by coach Chris Webster.",
    homeGym: "Wilton Baptist home court",
    address: "",
    email: "",
    teams: {
      boys: {
        division: "Boys Varsity",
        headCoach: "Chris Webster",
        headCoachDetail: "Head coach at Wilton Baptist for 10 seasons.",
        assistant: "Rob Newcome",
        assistantDetail: "Coaching for eight seasons."
      },
      girls: {
        division: "Girls Varsity",
        headCoach: "Chris Webster",
        headCoachDetail: "Head coach at Wilton Baptist for 10 seasons.",
        assistant: "",
        assistantDetail: ""
      }
    }
  },
  {
    id: "hv-rocks",
    name: "HV Rocks",
    short: "HVR",
    logo: "assets/optimized/team-hudson-valley-rocks-192.webp",
    summary: "HV Rocks has competed for nearly 30 years.",
    homeGym: "Open Arms Church",
    address: "2714 Curry Rd, Schenectady, NY 12303",
    email: "",
    teams: {
      boys: {
        division: "Boys Varsity",
        headCoach: "Marc Bailey",
        headCoachDetail: "Head coach with 15 seasons of coaching experience.",
        assistant: "Tim Stuitje",
        assistantDetail: "Assistant coach for three seasons, entering his fourth."
      }
    }
  },
  {
    id: "hv-flames",
    name: "HV Flames",
    short: "HVF",
    logo: "assets/icons/icon-192.png",
    summary: "HV Flames competes in the UBL Girls Varsity division.",
    homeGym: "Open Arms Church",
    address: "2714 Curry Rd, Schenectady, NY 12303",
    email: "",
    teams: {
      girls: {
        division: "Girls Varsity",
        headCoach: "Rebekah Johnson",
        headCoachDetail: "Additional coach information is being collected.",
        assistant: "",
        assistantDetail: ""
      }
    }
  }
];

const articles = [
  {
    slug: "2026-27-season-planning",
    title: "2026-27 UBL season planning is underway",
    eyebrow: "Season update",
    description: "The current UBL schedule opens Thursday, December 3, 2026, with league games planned through the winter and details finalized by the commissioner.",
    date: "July 22, 2026",
    isoDate: "2026-07-22",
    body: `
      <p>The Upstate Basketball League is preparing for its 2026-27 boys and girls varsity season. The current league schedule opens on Thursday, December 3, 2026.</p>
      <h2>What families and teams can expect</h2>
      <p>League games are organized around the published UBL schedule, with competition continuing through the winter. Game times, venues, and any schedule adjustments become official after confirmation by the league commissioner.</p>
      <p>The schedule page remains the official public source for dates, opponents, locations, game status, and final scores once they are reported through the league score system.</p>
      <div class="discovery-callout"><strong>Use the live schedule</strong><p>Check the current week, choose a division, and open available map directions from one place.</p><a class="button button-primary" href="schedule.html">View the UBL schedule</a></div>
    `
  },
  {
    slug: "2027-playoff-format",
    title: "UBL outlines separate 2027 varsity playoff brackets",
    eyebrow: "Playoff update",
    description: "The UBL plans separate boys and girls varsity playoff brackets in mid-February 2027, including a Seed 4 versus Seed 5 play-in game.",
    date: "July 22, 2026",
    isoDate: "2026-07-22",
    body: `
      <p>UBL postseason play is planned for mid-February 2027, with separate brackets for the Boys Varsity and Girls Varsity divisions.</p>
      <h2>The five-team path</h2>
      <p>Seed 4 plays Seed 5 in the opening play-in game. The winner advances to face Seed 1 in a semifinal, while Seed 2 meets Seed 3 in the other semifinal. The semifinal winners advance to the UBL championship game.</p>
      <p>Seeds will reflect league standings after regular-season results are reported. Dates and venues will be published after league confirmation.</p>
      <div class="discovery-callout"><strong>Follow the bracket</strong><p>See both varsity paths and the standings that will determine postseason seeds.</p><a class="button button-primary" href="bracket.html">View playoff brackets</a></div>
    `
  },
  {
    slug: "ubl-program-directory",
    title: "Explore the programs preparing for UBL competition",
    eyebrow: "League programs",
    description: "Meet the boys and girls varsity programs currently listed in the Upstate Basketball League directory for the 2026-27 season.",
    date: "July 22, 2026",
    isoDate: "2026-07-22",
    body: `
      <p>The UBL program directory currently includes The King's School, Perth, Wilton Baptist, HV Rocks, and HV Flames across the league's boys and girls varsity divisions.</p>
      <h2>One directory for useful program information</h2>
      <p>Each public team page brings together its approved coaching information, home-court details, program contact path, schedule, standings, and gallery link. Information that has not been approved by a team representative is clearly identified instead of being guessed.</p>
      <p>UBL is also welcoming another varsity program committed to organized competition, shared standards, and a meaningful championship path.</p>
      <div class="discovery-callout"><strong>Meet the teams</strong><p>Choose a division and open the public profile for each varsity team.</p><a class="button button-primary" href="teams.html">Explore UBL teams</a></div>
    `
  }
];

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function nav(active) {
  const links = [
    ["Home", "index.html"], ["Schedule", "schedule.html"], ["Standings", "standings.html"],
    ["Teams", "teams.html"], ["Bracket", "bracket.html"], ["League standards", "rules.html"],
    ["Gallery", "gallery.html"], ["News", "news.html"], ["Sponsors", "sponsors.html"], ["About", "about.html"]
  ];
  return links.map(([label, href]) => `<a${label === active ? ' class="active"' : ""} href="${href}">${label}</a>`).join("");
}

function header(active) {
  return `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="index.html" aria-label="Upstate Basketball League home"><img src="assets/optimized/ubl-logo-192.webp" alt="" width="192" height="295"><span><strong>Upstate</strong> Basketball League</span></a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span></span><span></span><span></span><span class="sr-only">Open menu</span></button>
      <nav class="site-nav" id="site-nav" aria-label="Main navigation">${nav(active)}</nav>
    </div>
  </header>`;
}

function metadata({ title, description, canonical, type = "website", base = false, schema = null }) {
  return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${base ? '<base href="../">' : ""}
  <meta name="description" content="${htmlEscape(description)}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#020f22">
  <title>${htmlEscape(title)}</title>
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="Upstate Basketball League">
  <meta property="og:title" content="${htmlEscape(title)}">
  <meta property="og:description" content="${htmlEscape(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${socialImage}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1600">
  <meta property="og:image:height" content="900">
  <meta property="og:image:alt" content="${socialAlt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${htmlEscape(title)}">
  <meta name="twitter:description" content="${htmlEscape(description)}">
  <meta name="twitter:image" content="${socialImage}">
  <meta name="twitter:image:alt" content="${socialAlt}">
  <link rel="manifest" href="site.webmanifest">
  <link rel="preload" href="assets/fonts/barlow-condensed-900-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/fonts/ibm-plex-sans-400-700-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="icon" type="image/png" sizes="32x32" href="assets/icons/favicon-32.png">
  <link rel="icon" type="image/png" sizes="64x64" href="assets/icons/favicon-64.png">
  <link rel="apple-touch-icon" sizes="180x180" href="assets/icons/apple-touch-icon-180.png">
  ${schema ? `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>` : ""}`;
}

function teamPage(program, key, team) {
  const slug = `${program.id}-${key}.html`;
  const canonical = `${canonicalBase}teams/${slug}`;
  const description = `${program.name} ${team.division.toLowerCase()} team profile with approved coaching information, home-court details, schedule, standings, and UBL program contacts.`;
  const teamSchema = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    "@id": `${canonical}#team`,
    name: `${program.name} ${team.division}`,
    sport: "Basketball",
    url: canonical,
    logo: `${canonicalBase}${program.logo}`,
    description: program.summary,
    memberOf: { "@id": `${canonicalBase}#organization` }
  };
  if (team.headCoach) teamSchema.coach = { "@type": "Person", name: team.headCoach };
  if (program.address) teamSchema.location = { "@type": "Place", name: program.homeGym, address: program.address };
  const coachText = team.headCoach
    ? `<div><dt>Head coach</dt><dd><strong>${htmlEscape(team.headCoach)}</strong><span>${htmlEscape(team.headCoachDetail)}</span></dd></div>`
    : `<div><dt>Head coach</dt><dd><span>Coaching information will be published after representative approval.</span></dd></div>`;
  const assistantText = team.assistant
    ? `<div><dt>Assistant coach</dt><dd><strong>${htmlEscape(team.assistant)}</strong><span>${htmlEscape(team.assistantDetail)}</span></dd></div>`
    : `<div><dt>Assistant coach</dt><dd><span>No public assistant coach profile has been submitted.</span></dd></div>`;
  const locationText = program.address
    ? `<a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(program.address)}">${htmlEscape(program.homeGym)}<span>${htmlEscape(program.address)}</span></a>`
    : `<span>${htmlEscape(program.homeGym)}</span><small>Street address has not been published.</small>`;
  const contactText = program.email
    ? `<a href="mailto:${program.email}">${program.email}</a>`
    : `<a href="mailto:Info.upstatebasketballleague@gmail.com?subject=${encodeURIComponent(`${program.name} program contact`)}">Ask UBL for the program contact</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>${metadata({ title: `${program.name} ${team.division} | UBL`, description, canonical, base: true, schema: teamSchema })}
  <link rel="stylesheet" href="styles.css?v=${releaseToken}">
  <link rel="stylesheet" href="team-profile-experience.css?v=${releaseToken}">
  <link rel="stylesheet" href="discovery.css?v=${releaseToken}">
  <script src="config.js?v=${releaseToken}" defer></script>
  <script src="analytics.js?v=${releaseToken}" defer></script>
  <script src="league-core.js?v=${releaseToken}" defer></script>
  <script src="data.js?v=${releaseToken}" defer></script>
  <script src="data-loader.js?v=${releaseToken}" defer></script>
  <script src="assets/vendor/gsap.min.js?v=${releaseToken}" defer></script>
  <script src="assets/vendor/ScrollTrigger.min.js?v=${releaseToken}" defer></script>
  <script src="script.js?v=${releaseToken}" defer></script>
  <script src="team-profile-experience.js?v=${releaseToken}" defer></script>
</head>
<body class="team-detail-page" data-team-program="${program.id}" data-team-division="${key}">${header("Teams")}
  <main class="team-detail-main" id="main">
    <section class="team-profile-shell" data-team-profile>
      <article class="static-team-profile section-wrap">
        <a class="static-team-back" href="teams.html">Back to all teams</a>
        <header class="static-team-header">
          <img src="${program.logo}" alt="${htmlEscape(program.name)} logo" width="192" height="192">
          <div><span>${team.division}</span><h1>${htmlEscape(program.name)}</h1><p>${htmlEscape(program.summary)}</p></div>
        </header>
        <div class="static-team-grid">
          <section aria-labelledby="team-staff-title"><h2 id="team-staff-title">Coaching staff</h2><dl>${coachText}${assistantText}</dl></section>
          <section aria-labelledby="team-program-title"><h2 id="team-program-title">Program information</h2><dl><div><dt>Division</dt><dd>${team.division}</dd></div><div><dt>Home court</dt><dd>${locationText}</dd></div><div><dt>Program contact</dt><dd>${contactText}</dd></div></dl></section>
        </div>
      </article>
      <section class="explore-panel section-wrap" aria-labelledby="team-explore-title">
        <div class="explore-panel-copy"><span class="explore-panel-eyebrow">Keep exploring</span><h2 id="team-explore-title">See where ${htmlEscape(program.name)} fits into the season.</h2></div>
        <nav class="explore-panel-links" aria-label="Keep exploring the UBL"><a href="schedule.html">League schedule</a><a href="standings.html">Current standings</a><a href="gallery.html?program=${program.id}&amp;division=${key}">Team gallery</a><a href="teams.html">All teams</a></nav>
      </section>
    </section>
  </main>
</body>
</html>\n`;
}

function newsIndexPage() {
  const canonical = `${canonicalBase}news.html`;
  const description = "Read official Upstate Basketball League season updates, playoff information, program announcements, and public league news.";
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Upstate Basketball League news",
    url: canonical,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${canonicalBase}news/${article.slug}.html`,
        name: article.title
      }))
    }
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>${metadata({ title: "UBL News and League Updates | Upstate NY", description, canonical, schema: itemList })}
  <link rel="stylesheet" href="styles.css?v=${releaseToken}">
  <link rel="stylesheet" href="discovery.css?v=${releaseToken}">
  <script src="config.js?v=${releaseToken}" defer></script><script src="analytics.js?v=${releaseToken}" defer></script><script src="site-shell.js?v=${releaseToken}" defer></script>
</head>
<body class="discovery-page news-index-page">${header("News")}
  <main id="main">
    <section class="discovery-hero"><div class="section-wrap"><span>Official league updates</span><h1>UBL news, clearly organized.</h1><p>Season planning, program information, playoff updates, and public league announcements from the Upstate Basketball League.</p></div></section>
    <section class="news-feed section-wrap" aria-labelledby="latest-news-title"><header><span>Latest from the league</span><h2 id="latest-news-title">League updates</h2></header><div class="news-grid">
      ${articles.map((article) => `<article class="news-card"><span>${article.eyebrow}</span><time datetime="${article.isoDate}">${article.date}</time><h3><a href="news/${article.slug}.html">${article.title}</a></h3><p>${article.description}</p><a class="news-card-link" href="news/${article.slug}.html">Read update <span aria-hidden="true">&#8594;</span></a></article>`).join("\n      ")}
    </div></section>
    <section class="explore-panel section-wrap" aria-labelledby="news-explore-title"><div class="explore-panel-copy"><span class="explore-panel-eyebrow">Keep exploring</span><h2 id="news-explore-title">Stay connected to the UBL season.</h2></div><nav class="explore-panel-links" aria-label="Keep exploring the UBL"><a href="schedule.html">Schedule</a><a href="standings.html">Standings</a><a href="teams.html">Teams</a><a href="about.html">About UBL</a></nav></section>
  </main>
</body>
</html>\n`;
}

function articlePage(article) {
  const canonical = `${canonicalBase}news/${article.slug}.html`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.description,
    datePublished: article.isoDate,
    dateModified: article.isoDate,
    mainEntityOfPage: canonical,
    image: socialImage,
    author: { "@id": `${canonicalBase}#organization` },
    publisher: { "@id": `${canonicalBase}#organization` }
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>${metadata({ title: `${article.title} | UBL`, description: article.description, canonical, type: "article", base: true, schema })}
  <meta property="article:published_time" content="${article.isoDate}">
  <link rel="stylesheet" href="styles.css?v=${releaseToken}"><link rel="stylesheet" href="discovery.css?v=${releaseToken}">
  <script src="config.js?v=${releaseToken}" defer></script><script src="analytics.js?v=${releaseToken}" defer></script><script src="site-shell.js?v=${releaseToken}" defer></script>
</head>
<body class="discovery-page news-article-page">${header("News")}
  <main id="main">
    <article class="league-article">
      <header class="league-article-hero"><div class="section-wrap"><a href="news.html">All league news</a><span>${article.eyebrow}</span><h1>${article.title}</h1><p>${article.description}</p><time datetime="${article.isoDate}">${article.date}</time></div></header>
      <div class="league-article-body section-wrap">${article.body}</div>
    </article>
    <section class="explore-panel section-wrap" aria-labelledby="article-explore-title"><div class="explore-panel-copy"><span class="explore-panel-eyebrow">Keep exploring</span><h2 id="article-explore-title">Keep following the UBL season.</h2></div><nav class="explore-panel-links" aria-label="Keep exploring the UBL"><a href="news.html">All news</a><a href="schedule.html">Schedule</a><a href="teams.html">Teams</a><a href="about.html">About UBL</a></nav></section>
  </main>
</body>
</html>\n`;
}

function write(relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

for (const program of programs) {
  for (const [key, team] of Object.entries(program.teams)) {
    write(`teams/${program.id}-${key}.html`, teamPage(program, key, team));
  }
}
write("news.html", newsIndexPage());
for (const article of articles) write(`news/${article.slug}.html`, articlePage(article));

console.log(`Generated ${programs.reduce((count, program) => count + Object.keys(program.teams).length, 0)} team pages and ${articles.length + 1} news pages.`);
