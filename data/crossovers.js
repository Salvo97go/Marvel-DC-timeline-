/*
 * Intercompany crossovers and industry history that affects both publishers.
 * Same format as marvel.js. publisher is set to "crossover" automatically.
 */
window.TIMELINE = window.TIMELINE || {};
window.TIMELINE.crossover = [
  { date: "1954-04", title: "Senate hearings on comics", issue: "", type: "milestone", characters: [], writers: [], artists: [], summary: "Psychiatrist Fredric Wertham's \"Seduction of the Innocent\" leads to US Senate hearings blaming comics for juvenile delinquency." },
  { date: "1954-10", title: "The Comics Code Authority", issue: "", type: "milestone", characters: [], writers: [], artists: [], summary: "Publishers adopt a self-censorship code. Horror and crime comics collapse, and the gap leads to the superhero revival of the Silver Age." },
  { date: "1976", title: "Superman vs. the Amazing Spider-Man", issue: "", type: "launch", characters: ["Superman", "Spider-Man", "Lex Luthor", "Doctor Octopus"], writers: ["Gerry Conway"], artists: ["Ross Andru"], summary: "The first Marvel/DC intercompany crossover, an oversized treasury edition." },
  { date: "1981-07", title: "Marvel Treasury Edition", issue: "28", type: "launch", characters: ["Superman", "Spider-Man", "Doctor Doom", "Parasite"], writers: ["Jim Shooter"], artists: ["John Buscema"], summary: "Superman and Spider-Man: the second meeting." },
  { date: "1981-10", title: "DC Special Series", issue: "27", type: "launch", characters: ["Batman", "Hulk", "Joker", "Shaper of Worlds"], writers: ["Len Wein"], artists: ["José Luis García-López"], summary: "Batman vs. the Incredible Hulk." },
  { date: "1982", title: "Marvel and DC Present", issue: "1", type: "launch", characters: ["X-Men", "Teen Titans", "Darkseid", "Deathstroke", "Dark Phoenix"], writers: ["Chris Claremont"], artists: ["Walt Simonson"], summary: "The Uncanny X-Men and the New Teen Titans: the two hottest team books of the era meet." },
  { date: "1996-04", title: "Amalgam Comics", issue: "", type: "milestone", event: "dc-vs-marvel", characters: [], writers: [], artists: [], summary: "During DC vs. Marvel, both companies publish 24 one-shots of fused characters, such as Dark Claw (Batman + Wolverine) and Super-Soldier (Superman + Captain America)." },
  { date: "1996-06", title: "Batman/Captain America", issue: "", type: "launch", characters: ["Batman", "Captain America", "Joker", "Red Skull"], writers: ["John Byrne"], artists: ["John Byrne"], summary: "A World War II Elseworlds team-up." },
  { date: "1997-08", title: "Batman/Spider-Man", issue: "", type: "launch", characters: ["Batman", "Spider-Man", "Kingpin", "Ra's al Ghul"], writers: ["J.M. DeMatteis"], artists: ["Graham Nolan"], summary: "The last Marvel/DC crossover for years." },
  { date: "2025-09", title: "Deadpool/Batman", issue: "1", type: "launch", characters: ["Deadpool", "Batman", "Joker"], writers: ["Zeb Wells"], artists: ["Greg Capullo"], summary: "The first new Marvel/DC crossover in over 20 years, published by Marvel." },
  { date: "2025-11", title: "Batman/Deadpool", issue: "1", type: "launch", characters: ["Batman", "Deadpool"], writers: ["Grant Morrison"], artists: ["Dan Mora"], summary: "DC's half of the 2025 crossover." }
];

/*
 * Hero / villain tags for the character browser. Characters not listed here
 * show up under "All" only. Add names exactly as they appear in `characters`.
 */
window.TIMELINE.roles = {
  villain: [
    "Red Skull", "Mole Man", "Skrulls", "Doctor Doom", "Loki", "Vulture", "Doctor Octopus", "Chameleon", "Magneto", "Brotherhood of Evil Mutants",
    "Green Goblin", "Kang", "Dormammu", "Galactus", "Kingpin", "Kree", "Ronan the Accuser", "Ultron", "Mephisto", "Morbius", "Thanos", "Jackal",
    "Wendigo", "Bullseye", "Sabretooth", "Hellfire Club", "Apocalypse", "Marauders", "Mister Sinister", "Kraven the Hunter", "Venom", "Carnage",
    "Madelyne Pryor", "Cassandra Nova", "Nitro", "Norman Osborn", "Dark Avengers", "Baron Zemo", "Hydra", "Knull", "Morlun", "Lizard",
    "Joker", "Catwoman", "Lex Luthor", "Penguin", "Scarecrow", "Two-Face", "Cheetah", "Riddler", "Brainiac", "Bizarro", "Mr. Freeze", "Metallo",
    "Gorilla Grodd", "Starro", "General Zod", "Sinestro", "Reverse-Flash", "Poison Ivy", "Darkseid", "Ra's al Ghul", "Talia al Ghul", "Deathstroke",
    "Anti-Monitor", "Doomsday", "Bane", "Cyborg Superman", "Parallax", "Hush", "Maxwell Lord", "Black Glove", "Black Hand", "Court of Owls",
    "The Batman Who Laughs", "Punchline", "Harley Quinn", "Ozymandias", "Parasite", "Dark Phoenix", "Shaper of Worlds", "Celestials"
  ],
  hero: [
    "Human Torch (Jim Hammond)", "Namor", "Captain America", "Bucky", "Groot", "Fantastic Four", "Mister Fantastic", "Invisible Woman",
    "Human Torch (Johnny Storm)", "The Thing", "Hulk", "Spider-Man", "Thor", "Ant-Man", "Iron Man", "Wasp", "Doctor Strange", "Avengers",
    "X-Men", "Professor X", "Cyclops", "Jean Grey", "Beast", "Iceman", "Angel", "Scarlet Witch", "Quicksilver", "Daredevil", "Black Widow",
    "Hawkeye", "Clea", "Silver Surfer", "Black Panther", "Captain Marvel (Mar-Vell)", "Carol Danvers", "Vision", "Falcon", "Luke Cage",
    "Ghost Rider (Johnny Blaze)", "Drax", "Blade", "Punisher", "Iron Fist", "Wolverine", "Storm", "Nightcrawler", "Colossus", "Thunderbird",
    "Gamora", "Moon Knight", "Star-Lord", "Rocket Raccoon", "Kitty Pryde", "Emma Frost", "She-Hulk", "Phoenix", "Elektra", "Rogue",
    "New Mutants", "X-Factor", "Morlocks", "Cable", "Gambit", "Deadpool", "Domino", "Adam Warlock", "Thunderbolts", "Jessica Jones", "Runaways",
    "X-23", "Winter Soldier", "Nick Fury", "Guardians of the Galaxy", "Miles Morales", "Kate Bishop", "Kamala Khan", "Spider-Gwen", "Medusa",
    "Illuminati", "Black Bolt", "Riri Williams", "Moira MacTaggert", "Sentry",
    "Superman", "Lois Lane", "Batman", "Commissioner Gordon", "Flash (Jay Garrick)", "Hawkman (Carter Hall)", "Spectre", "Robin (Dick Grayson)",
    "Green Lantern (Alan Scott)", "Justice Society of America", "Aquaman", "Green Arrow", "Wonder Woman", "Superboy", "Martian Manhunter",
    "Flash (Barry Allen)", "Legion of Super-Heroes", "Supergirl", "Green Lantern (Hal Jordan)", "Justice League of America", "Doom Patrol",
    "Teen Titans", "Kid Flash", "Aqualad", "Batgirl (Barbara Gordon)", "New Gods", "Orion", "Swamp Thing", "Green Lantern (John Stewart)",
    "Shazam", "Cyborg", "Raven", "Starfire", "Beast Boy", "Jason Todd", "Nightwing", "John Constantine", "Booster Gold", "Carrie Kelley",
    "Rorschach", "Doctor Manhattan", "Nite Owl", "Silk Spectre", "Flash (Wally West)", "Blue Beetle", "Suicide Squad", "Amanda Waller",
    "Deadshot", "Dream", "Tim Drake", "Steel", "Eradicator", "Green Lantern (Kyle Rayner)", "Starman (Jack Knight)", "Red Hood",
    "Blue Beetle (Jaime Reyes)", "Damian Wayne", "Robin (Damian Wayne)", "Batwoman (Kate Kane)", "Green Lantern (Hal Jordan)",
    "Batman (Dick Grayson)", "Deadman", "Batman (Thomas Wayne)", "Mister Miracle", "Big Barda", "Monitors"
  ]
};
