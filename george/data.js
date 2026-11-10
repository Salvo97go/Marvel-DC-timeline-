/*
 * George magazine (1995–2001), issue by issue.
 *
 * date   – cover date "YYYY-MM" (first month for double issues)
 * span   – months the issue covers (2 for bimonthly issues like Oct/Nov 1995)
 * label  – the date as printed on the cover
 * cover  – who is on the cover
 * concept – how they were shown
 * photo  – cover photographer, when known
 * lines  – cover lines and themes
 * inside – interviews and features: { k: "interview" | "feature", who, text }
 * sure   – how well the cover is sourced:
 *            "confirmed" – named in news coverage or an editorial roundup
 *            "reported"  – described in resale listings only; check against a copy
 *            "unknown"   – no source found yet
 * src    – keys into SOURCES below
 * img    – optional cover image URL. Without one, the app draws a cover.
 *
 * Sources disagree on some months; the notes say where.
 */
window.GEORGE = window.GEORGE || {};

window.GEORGE.sources = {
  wiki: { name: "Wikipedia: George (magazine)", url: "https://en.wikipedia.org/wiki/George_(magazine)" },
  covers: { name: "Yahoo/People: The most memorable celebrity covers of George", url: "https://www.yahoo.com/entertainment/celebrity/articles/most-memorable-celebrity-covers-jfk-210137988.html" },
  inside: { name: "Yahoo: The inside story of JFK Jr.'s George", url: "https://www.yahoo.com/entertainment/just-f-cking-coolest-inside-231100788.html" },
  spokesman95: { name: "Spokesman-Review, Sept. 9, 1995: JFK Jr. launches new magazine", url: "https://www.spokesman.com/stories/1995/sep/09/jfk-jr-launches-new-magazine/" },
  parade: { name: "Parade: Cindy Crawford shares JFK Jr.'s note about her cover", url: "https://parade.com/news/cindy-crawford-reveals-jfk-jr-s-handwritten-note-about-her-beautiful-george-cover" },
  barbra: { name: "Barbra Archives: George, November 1996", url: "http://barbra-archives.com/bjs_library/90s/george_1996.html" },
  seattle97: { name: "Seattle Times, Aug. 11, 1997: JFK Jr. calls kin 'poster boys for bad behavior'", url: "https://archive.seattletimes.com/archive/19970811/2554256/jfk-jr-calls-kin-poster-boys-for-bad-behavior" },
  cnn97: { name: "CNN AllPolitics, Aug. 11, 1997: By George, JFK Jr. bares a lot", url: "https://www.cnn.com/ALLPOLITICS/1997/08/11/kennedy/" },
  ford97: { name: "WorthPoint: George, August 1997, Harrison Ford", url: "https://www.worthpoint.com/worthopedia/george-magazine-august-1997-harrison-1040094092" },
  neeson99: { name: "Amazon: George, June 1999 (Liam Neeson cover)", url: "https://www.amazon.com/George-Magazine-Liam-Neeson-cover/dp/B003N60USA" },
  origmags: { name: "Original Magazines: George back issues", url: "https://www.originalmagazines.com/collections/george" },
  ebay: { name: "eBay: George magazine listings", url: "https://www.ebay.com/b/George-Magazine/280/bn_7023367154" },
  etsy: { name: "Etsy: vintage George magazines", url: "https://www.etsy.com/market/vintage_george_magazines" },
  tfs: { name: "The Fashion Spot forum: George Magazine (1995–2001)", url: "https://forums.thefashionspot.com/threads/george-magazine-1995-2001.391969/" },
  farewell: { name: "Amazon: George, Farewell Issue (Vol. 6)", url: "https://www.amazon.com/George-Magazine-Farewell-Issue-Vol/dp/B001B4D0WE" },
  abc01: { name: "ABC News: Kennedy brainchild 'George' folds", url: "https://abcnews.com/Politics/story?id=122119&page=1" },
  aolclose: { name: "AOL/People: Why did George close?", url: "https://www.aol.com/articles/why-did-jfk-jr-george-100000991.html" },
  aolberman: { name: "AOL/People: Where is Michael Berman now?", url: "https://www.aol.com/articles/where-michael-berman-now-george-140137290.html" },
  ankler: { name: "The Ankler: When JFK Jr. and David Pecker made a magazine", url: "https://theankler.com/jfk-jr-david-pecker-donald-trump-george-magazine/" },
  lrb: { name: "London Review of Books: Inigo Thomas, JFK Jr and Me", url: "https://www.lrb.co.uk/the-paper/v48/n10/inigo-thomas/diary" },
  rg: { name: "ResearchGate: Public figures interviewed by JFK Jr. for George", url: "https://www.researchgate.net/figure/Public-Figures-Interviewed-by-John-F-Kennedy-Jr-for-George-Magazine_tbl1_351163644" },
  cbs: { name: "CBS News: George pays tribute to JFK Jr.", url: "https://cbsnews.com/news/igeorge-i-pays-tribute-to-jfk-jr" },
  beast: { name: "Daily Beast: Gene Ho is resurrecting George", url: "https://www.thedailybeast.com/qanon-fan-gene-ho-is-resurrecting-jfk-jrs-magazine-george-with-a-trump-twist/" },
  wikifile: { name: "Wikipedia: cover of the first issue (non-free file)", url: "https://en.wikipedia.org/wiki/File:George_(magazine).jpg" },
  today: { name: "Today: Drew Barrymore recalls JFK Jr. asking her to be on the cover", url: "https://www.today.com/popculture/drew-barrymore-george-cover-jfk-jr-conversation-rcna262067" },
  vice: { name: "Vice: A magazine from 1997 is selling for thousands because of QAnon", url: "https://www.vice.com/en/article/a-magazine-from-1997-is-selling-for-thousands-of-dollars-online-because-of-qanon/" },
  ia97: { name: "Internet Archive: scan of George, February 1997", url: "https://archive.org/details/george-magazine-february-1997-survival-guide-to-the-future-bill-gates-interview" },
  mar97: { name: "Amazon: George, March 1997 (Special Hollywood Issue)", url: "https://www.amazon.com/George-Magazine-March-Special-Hollywood/dp/B008LP8ITQ" },
  sep96: { name: "eBay: George, September 1996, Drew Barrymore", url: "https://www.ebay.com/itm/356627218777" },
  cnn01: { name: "CNN, Jan. 4, 2001: George magazine to fold in March", url: "http://archives.cnn.com/2001/ALLPOLITICS/stories/01/04/george.magazine/index.html" },
  fare01: { name: "eBay: George farewell issue, March 2001", url: "https://www.ebay.com/itm/117399447837" },
  spy98: { name: "Spy, March 1998: Poster Boy for Poster-Boy Behavior (Google Books)", url: "https://books.google.com/books?id=24tXv1nFv40C&q=George%20Magazine&pg=PA37" },
  harvard05: { name: "Harvard Gazette, Oct. 13, 2005: Not just politics as usual", url: "https://news.harvard.edu/gazette/story/2005/10/not-just-politics-as-usual/" },
  lavoce: { name: "La Voce di New York: George magazine is back", url: "https://lavocedinewyork.com/en/news/2024/10/15/george-magazines-revival-is-fueled-by-conspiracism-radicalization/" }
};

window.GEORGE.issues = [
  // ── 1995 ──────────────────────────────────────────────────────────
  { date: "1995-10", span: 2, label: "Oct/Nov 1995", cover: ["Cindy Crawford"], concept: "Dressed as George Washington, in a powdered wig and a cropped coat that showed her midriff", photo: "Herb Ritts", lines: ["Inaugural issue", "John Kennedy talks to George Wallace", "President Madonna", "Dodging bullets with the FBI's Louis Freeh", "Caleb Carr on the next american revolution", "Plus: Julia Roberts, Mark Leyner and the new divas of politics"], inside: [{ k: "interview", who: "George Wallace", text: "Kennedy's first big interview for the magazine: the former segregationist governor of Alabama, near the end of his life." }, { k: "feature", who: "Madonna", text: "\"President Madonna\" on the cover." }, { k: "feature", who: "Louis Freeh", text: "Dodging bullets with the FBI director." }, { k: "feature", who: "Caleb Carr", text: "On the next American revolution." }, { k: "feature", who: "Julia Roberts", text: "Named on the cover." }], notes: "Creative director Matt Berman (no relation to co-founder Michael Berman) built the cover; Ritts proposed Crawford and the Washington costume. Kennedy later sent her a handwritten note calling it a beautiful image. It was revealed at the Federal Hall launch on Sept. 7, 1995. Cover lines here are read off the cover itself.", sure: "confirmed", src: ["wikifile", "covers", "parade", "spokesman95", "inside", "wiki"], img: "covers/1995-10.jpg" },
  { date: "1995-12", span: 2, label: "Dec 1995/Jan 1996", cover: ["Robert De Niro"], concept: "As George Washington, repeating the idea of the first cover", photo: "", lines: [], inside: [], notes: "", sure: "confirmed", src: ["covers"] },

  // ── 1996 ──────────────────────────────────────────────────────────
  { date: "1996-02", span: 2, label: "Feb/Mar 1996", cover: ["Charles Barkley"], concept: "", photo: "", lines: [], inside: [], notes: "", sure: "confirmed", src: ["covers", "ebay"] },
  { date: "1996-04", span: 2, label: "Apr/May 1996", cover: ["Howard Stern"], concept: "", photo: "", lines: ["Not Just Politics as Usual"], inside: [], notes: "Described in listings as the Howard Stern issue.", sure: "reported", src: ["ebay", "etsy"] },
  { date: "1996-06", span: 2, label: "Jun/Jul 1996", cover: ["Demi Moore"], concept: "As Martha Washington, timed to the release of Striptease", photo: "", lines: [], inside: [], notes: "", sure: "confirmed", src: ["covers"] },
  { date: "1996-08", span: 1, label: "Aug 1996", cover: ["Newt Gingrich"], concept: "With a lion", photo: "", lines: ["Convention summer"], inside: [], notes: "The first single-month issue: George comes out monthly from here on. The cover comes from a seller's description.", sure: "reported", src: ["ebay"] },
  { date: "1996-09", span: 1, label: "Sep 1996", cover: ["Drew Barrymore"], concept: "As Marilyn Monroe, recalling her 1962 \"Happy Birthday, Mr. President\" for John F. Kennedy", photo: "", lines: ["The 20 Most Fascinating Women in Politics"], inside: [{ k: "feature", who: "", text: "The 20 Most Fascinating Women in Politics." }], notes: "Often called the magazine's most controversial cover: Kennedy's son putting Marilyn Monroe on his cover. Barrymore later said Kennedy called her himself to propose it.", sure: "confirmed", src: ["today", "covers", "sep96"] },
  { date: "1996-10", span: 1, label: "Oct 1996", cover: ["Richard Nixon"], concept: "", photo: "", lines: [], inside: [], notes: "One seller lists this as a Richard Nixon cover. Not confirmed elsewhere.", sure: "reported", src: ["ebay"] },
  { date: "1996-11", span: 1, label: "Nov 1996", cover: ["Barbra Streisand"], concept: "", photo: "", lines: ["Election issue"], inside: [{ k: "feature", who: "Donna Rice", text: "Listed among the issue's stories." }, { k: "feature", who: "Ross Perot", text: "Listed among the issue's stories." }], notes: "On sale ahead of the Nov. 5 election.", sure: "confirmed", src: ["barbra", "ebay"] },
  { date: "1996-12", span: 1, label: "Dec 1996", cover: ["Woody Harrelson"], concept: "", photo: "", lines: [], inside: [{ k: "interview", who: "Bill Clinton", text: "An exclusive interview with the newly re-elected president." }], notes: "", sure: "confirmed", src: ["covers"] },

  // ── 1997 ──────────────────────────────────────────────────────────
  { date: "1997-01", span: 1, label: "Jan 1997", cover: ["Claudia Schiffer"], concept: "", photo: "", lines: [], inside: [], notes: "The covers roundup files this under 'Light & Dark' covers.", sure: "confirmed", src: ["covers"] },
  { date: "1997-02", span: 1, label: "Feb 1997", cover: ["Karen Mulder"], concept: "Saluting in a red-and-white space-age outfit, with Mount Rushmore behind her", photo: "", lines: ["Survival Guide to the Future", "Bill Gates talks to John Kennedy about Microsoft, money, and world domination", "Can Politically Incorrect's Bill Maher make it in the big time?", "Good news: live forever! Love your job!"], inside: [{ k: "interview", who: "Bill Gates", text: "Kennedy's long interview with the Microsoft founder about how technology could change politics and democracy." }, { k: "feature", who: "Bill Maher", text: "Named on the cover." }, { k: "feature", who: "Jimmy Carter", text: "Named in listings and on the cover." }, { k: "feature", who: "Carl Sagan", text: "Named on the cover." }], notes: "Since about 2021 this issue has become a QAnon collectible, with copies listed for thousands of dollars. A scan is on the Internet Archive.", sure: "confirmed", src: ["covers", "ia97", "vice", "wiki"], img: "covers/1997-02.jpg" },
  { date: "1997-03", span: 1, label: "Mar 1997", cover: ["Julia Roberts"], concept: "As the suffragist Susan B. Anthony, her face on a dollar coin", photo: "", lines: ["Special Hollywood Issue"], inside: [{ k: "feature", who: "Clint Eastwood", text: "Named in listings." }, { k: "feature", who: "Whoopi Goldberg", text: "Named in listings." }, { k: "feature", who: "Dennis Hopper", text: "Named in listings." }, { k: "feature", who: "Chevy Chase", text: "Named in listings." }], notes: "", sure: "confirmed", src: ["covers", "mar97"] },
  { date: "1997-04", span: 1, label: "Apr 1997", cover: ["Chundo the dog"], concept: "A dog dressed as George Washington", photo: "", lines: ["Can America Be Saved?"], inside: [], notes: "From a single seller's description. Not confirmed elsewhere.", sure: "reported", src: ["etsy"] },
  { date: "1997-05", span: 1, label: "May 1997", cover: ["Katie Couric"], concept: "Smiling, in a hat", photo: "", lines: ["The Hot Media Issue"], inside: [], notes: "", sure: "reported", src: ["etsy", "ebay"] },
  { date: "1997-06", span: 1, label: "Jun 1997", cover: ["George Clooney"], concept: "As Thomas Jefferson", photo: "", lines: [], inside: [], notes: "", sure: "reported", src: ["etsy"] },
  { date: "1997-07", span: 1, label: "Jul 1997", cover: ["Jenny McCarthy"], concept: "", photo: "", lines: [], inside: [{ k: "feature", who: "Chelsea Clinton", text: "Named in listings." }, { k: "feature", who: "Ralph Reed", text: "Named in listings." }], notes: "", sure: "reported", src: ["etsy", "ebay"] },
  { date: "1997-08", span: 1, label: "Aug 1997", cover: ["Harrison Ford"], concept: "Dressed as Abraham Lincoln, after playing a president in Air Force One", photo: "", lines: ["The Secret Passions of Harrison Ford"], inside: [], notes: "Ford had just played a fictional president in Air Force One and an Irish-American cop in The Devil's Own.", sure: "confirmed", src: ["covers", "ford97"] },
  { date: "1997-09", span: 1, label: "Sep 1997", cover: ["Kate Moss"], concept: "Nude, as Eve", photo: "Mario Sorrenti", lines: ["The Temptation Issue"], inside: [{ k: "feature", who: "John F. Kennedy Jr.", text: "Editor's letter calling his cousins Joseph P. Kennedy II and Michael Kennedy \"poster boys for bad behavior\", illustrated with a photo of Kennedy, apparently nude, gazing at an apple." }], notes: "The editor's letter made national news a month before the cover date, on Aug. 11, 1997.", sure: "confirmed", src: ["covers", "seattle97", "cnn97"] },
  { date: "1997-10", span: 1, label: "Oct 1997", cover: ["Elizabeth Hurley"], concept: "", photo: "Michael Thompson", lines: [], inside: [], notes: "", sure: "reported", src: ["tfs"] },
  { date: "1997-11", span: 1, label: "Nov 1997", cover: ["Barbara Walters"], concept: "In a long red dress among stacked televisions", photo: "", lines: ["What Makes Barbara Walters Cry", "Election '97"], inside: [], notes: "From a seller's description. Some listings put a Barbara Walters cover in December instead.", sure: "reported", src: ["ebay"] },
  { date: "1997-12", span: 1, label: "Dec 1997", cover: ["Kevin Costner"], concept: "", photo: "", lines: ["Can Mr. Americana Get Lucky Again?"], inside: [], notes: "Released alongside The Postman.", sure: "reported", src: ["etsy", "ebay"] },

  // ── 1998 ──────────────────────────────────────────────────────────
  { date: "1998-01", span: 1, label: "Jan 1998", cover: ["Pamela Anderson"], concept: "", photo: "", lines: [], inside: [], notes: "From a seller's description.", sure: "reported", src: ["ebay"] },
  { date: "1998-02", span: 1, label: "Feb 1998", cover: ["Robert De Niro", "Dustin Hoffman"], concept: "Together, for Wag the Dog", photo: "", lines: [], inside: [], notes: "The film about a faked war to distract from a presidential sex scandal opened weeks before the Lewinsky story broke.", sure: "reported", src: ["etsy"] },
  { date: "1998-03", span: 1, label: "Mar 1998", cover: ["John Travolta"], concept: "In character for Primary Colors", photo: "", lines: ["Travolta Unfurls in Primary Colors"], inside: [], notes: "", sure: "reported", src: ["origmags"] },
  { date: "1998-04", span: 1, label: "Apr 1998", cover: ["Tom Hanks"], concept: "As a rocket scientist, for From the Earth to the Moon", photo: "", lines: [], inside: [], notes: "", sure: "reported", src: ["origmags"] },
  { date: "1998-05", span: 1, label: "May 1998", cover: ["Christy Turlington"], concept: "", photo: "", lines: ["The Media Issue"], inside: [], notes: "Editor Gary Ginsberg discussed the media issue on C-SPAN's Washington Journal with Matt Drudge and Hanna Rosin on April 25, 1998, while it was on sale.", sure: "reported", src: ["ebay", "wiki"] },
  { date: "1998-06", span: 1, label: "Jun 1998", cover: ["Johnny Depp"], concept: "", photo: "", lines: [], inside: [], notes: "", sure: "reported", src: ["etsy"] },
  { date: "1998-07", span: 1, label: "Jul 1998", cover: ["Bruce Willis"], concept: "", photo: "", lines: ["Armageddon", "Titanic"], inside: [], notes: "", sure: "reported", src: ["origmags"] },
  { date: "1998-08", span: 1, label: "Aug 1998", cover: ["Charlize Theron"], concept: "", photo: "", lines: ["Rise from Milkmaid to Movie Star"], inside: [], notes: "", sure: "reported", src: ["etsy"] },
  { date: "1998-09", span: 1, label: "Sep 1998", cover: [], concept: "", photo: "", lines: [], inside: [{ k: "feature", who: "", text: "The 20 Most Fascinating Women in Politics, according to listings." }], notes: "Still unidentified. Listings describe Versace models, or three people in pirate costumes, without naming anyone.", sure: "unknown", src: ["etsy", "ebay"] },
  { date: "1998-10", span: 1, label: "Oct 1998", cover: ["Edward Norton"], concept: "", photo: "", lines: ["The Conspiracy Issue", "American History X: A Shocking Vision"], inside: [], notes: "", sure: "reported", src: ["etsy"] },
  { date: "1998-11", span: 1, label: "Nov 1998", cover: ["Peter Jennings"], concept: "", photo: "", lines: ["Vietnam", "Election '98"], inside: [{ k: "interview", who: "Võ Nguyên Giáp", text: "Kennedy's interview with the North Vietnamese general who led the war against France and the United States." }], notes: "", sure: "reported", src: ["origmags", "inside"] },
  { date: "1998-12", span: 1, label: "Dec 1998", cover: ["Sean Penn"], concept: "", photo: "", lines: ["The Power 50"], inside: [{ k: "feature", who: "Monica Lewinsky", text: "Named on the cover with the Power 50 list." }], notes: "On sale as the House moved toward impeachment.", sure: "reported", src: ["origmags"] },

  // ── 1999 ──────────────────────────────────────────────────────────
  { date: "1999-01", span: 1, label: "Jan 1999", cover: ["Robert Duvall"], concept: "", photo: "", lines: ["The Year in Politics", "Predictions 1999"], inside: [{ k: "feature", who: "John McCain", text: "Named on the cover." }, { k: "feature", who: "James Carville", text: "Named in listings." }], notes: "", sure: "reported", src: ["ebay"] },
  { date: "1999-02", span: 1, label: "Feb 1999", cover: ["Ronald Reagan"], concept: "", photo: "", lines: ["The Money Issue"], inside: [], notes: "Several listings describe a Ronald Reagan cover.", sure: "reported", src: ["ebay"] },
  { date: "1999-03", span: 1, label: "Mar 1999", cover: ["Matthew McConaughey", "Elizabeth Hurley"], concept: "", photo: "", lines: [], inside: [], notes: "From a seller's description. Not confirmed elsewhere.", sure: "reported", src: ["ebay"] },
  { date: "1999-04", span: 1, label: "Apr 1999", cover: ["Garth Brooks"], concept: "", photo: "", lines: ["The 20 Most Fascinating Men in Politics"], inside: [{ k: "feature", who: "Rudy Giuliani", text: "Named in listings with the 20 Most Fascinating Men feature." }], notes: "", sure: "reported", src: ["ebay"] },
  { date: "1999-05", span: 1, label: "May 1999", cover: ["Calista Flockhart"], concept: "", photo: "", lines: [], inside: [], notes: "", sure: "reported", src: ["ebay"] },
  { date: "1999-06", span: 1, label: "Jun 1999", cover: ["Liam Neeson"], concept: "", photo: "", lines: [], inside: [], notes: "", sure: "reported", src: ["neeson99"] },
  { date: "1999-07", span: 1, label: "Jul 1999", cover: ["Salma Hayek"], concept: "", photo: "", lines: [], inside: [], notes: "On newsstands when Kennedy died on July 16.", sure: "reported", src: ["ebay"] },
  { date: "1999-08", span: 1, label: "Aug 1999", cover: ["Ben Stiller"], concept: "", photo: "", lines: [], inside: [], notes: "", sure: "reported", src: ["ebay"] },
  { date: "1999-09", span: 1, label: "Sep 1999", cover: ["Rob Lowe"], concept: "", photo: "", lines: ["Campaign 2000"], inside: [{ k: "feature", who: "Janet Reno", text: "Named on the cover." }, { k: "feature", who: "Ronald Reagan", text: "A story on the Reagans." }], notes: "Rob Lowe was about to start on The West Wing. Sellers describe this as the last issue Kennedy worked on.", sure: "reported", src: ["origmags", "ebay"] },
  { date: "1999-10", span: 1, label: "Oct 1999", cover: ["John F. Kennedy Jr."], concept: "Tribute issue", photo: "", lines: ["John Kennedy: A Tribute"], inside: [{ k: "feature", who: "John F. Kennedy Jr.", text: "Staff and friends remember the founding editor." }], notes: "One listing puts a tribute issue in November instead.", sure: "reported", src: ["ebay", "cbs"] },
  { date: "1999-11", span: 1, label: "Nov 1999", cover: ["Arnold Schwarzenegger"], concept: "", photo: "", lines: [], inside: [], notes: "The first issue after Hachette took full control, with Frank Lalli as editor.", sure: "reported", src: ["ebay"] },
  { date: "1999-12", span: 2, label: "Dec 1999/Jan 2000", cover: ["Denzel Washington"], concept: "", photo: "", lines: [], inside: [], notes: "Some listings date a Denzel Washington cover to December 2000 instead.", sure: "confirmed", src: ["covers"] },

  // ── 2000 ──────────────────────────────────────────────────────────
  { date: "2000-02", span: 2, label: "Feb/Mar 2000", cover: ["Donald Trump"], concept: "", photo: "", lines: [], inside: [], notes: "Trump was weighing a Reform Party run for president.", sure: "reported", src: ["ebay", "ankler"] },
  { date: "2000-04", span: 1, label: "Apr 2000", cover: ["Bono"], concept: "", photo: "", lines: [], inside: [], notes: "", sure: "reported", src: ["etsy"] },
  { date: "2000-05", span: 1, label: "May 2000", cover: ["Al Gore", "George W. Bush"], concept: "As caricatures", photo: "", lines: ["Will the Biggest Liar Win?"], inside: [], notes: "", sure: "reported", src: ["etsy"] },
  { date: "2000-06", span: 1, label: "Jun 2000", cover: ["Gisele Bündchen"], concept: "", photo: "", lines: [], inside: [{ k: "feature", who: "Tim Russert", text: "Named in listings." }, { k: "feature", who: "Laura Dern", text: "Named in listings." }], notes: "", sure: "confirmed", src: ["covers", "ebay"] },
  { date: "2000-07", span: 1, label: "Jul 2000", cover: ["Mel Gibson"], concept: "For The Patriot", photo: "", lines: [], inside: [{ k: "feature", who: "Jay Leno", text: "Named in listings." }, { k: "feature", who: "Rudy Giuliani", text: "Named in listings." }, { k: "feature", who: "J. C. Watts", text: "Named in listings." }], notes: "", sure: "reported", src: ["ebay"] },
  { date: "2000-08", span: 1, label: "Aug 2000", cover: ["John F. Kennedy Jr.", "Ronald Reagan"], concept: "Two covers: one of Kennedy, one of Reagan", photo: "", lines: ["Special Convention Issue"], inside: [], notes: "Printed with two different covers.", sure: "reported", src: ["ebay"] },
  { date: "2000-09", span: 1, label: "Sep 2000", cover: ["Cindy Crawford", "Rande Gerber"], concept: "Crawford returns, five years after the first cover, with her husband", photo: "", lines: [], inside: [], notes: "", sure: "reported", src: ["etsy"] },
  { date: "2000-10", span: 1, label: "Oct 2000", cover: ["Michael J. Fox"], concept: "", photo: "", lines: ["The First Annual George Awards", "Fifth Anniversary Collector's Issue"], inside: [], notes: "Fox had just left Spin City to work on Parkinson's research.", sure: "reported", src: ["ebay"] },
  { date: "2000-11", span: 1, label: "Nov 2000", cover: ["The West Wing cast"], concept: "", photo: "", lines: ["Why The West Wing Will Rule Again"], inside: [], notes: "On sale for the Nov. 7 election.", sure: "reported", src: ["etsy"] },
  { date: "2000-12", span: 2, label: "Dec 2000/Jan 2001", cover: [], concept: "", photo: "", lines: [], inside: [], notes: "Not identified. Some listings place a Denzel Washington and Al Gore issue here.", sure: "unknown", src: ["ebay"] },

  // ── 2001 ──────────────────────────────────────────────────────────
  { date: "2001-03", span: 1, label: "Mar 2001 · Farewell Issue", cover: ["John F. Kennedy Jr."], concept: "The founding editor on the cover of the last issue, a tribute to him", photo: "", lines: ["Farewell Issue", "Vol. VI"], inside: [], notes: "When Hachette announced the closure in January 2001, CNN and ABC News reported that a final tribute issue would reach newsstands in March. Wikipedia gives January 2001 as the end date, which is when the closure was announced.", sure: "confirmed", src: ["cnn01", "abc01", "fare01", "farewell"] }
];

// The magazine's own story.
window.GEORGE.history = [
  { date: "1995-09-07", title: "Launch at Federal Hall", text: "Kennedy unveils George at a press conference at Federal Hall in Manhattan, where Washington took the oath of office, and shows a giant print of the Cindy Crawford cover.", people: ["John F. Kennedy Jr.", "Michael J. Berman"], src: ["spokesman95", "parade"] },
  { date: "1995-09", title: "Kennedy, Berman and Hachette", text: "John F. Kennedy Jr. and the PR executive Michael J. Berman found the magazine with Hachette Filipacchi, whose chief David Pecker backed the idea after Kennedy pitched it to him.", people: ["John F. Kennedy Jr.", "Michael J. Berman", "David Pecker"], src: ["wiki", "ankler"] },
  { date: "1996-08", title: "George goes monthly", text: "After five bimonthly issues, the August 1996 issue starts a monthly schedule.", people: [], src: ["ebay"] },
  { date: "1997-02", title: "Founders fall out", text: "By early 1997 Kennedy and Berman are locked in a power struggle over the magazine's direction.", people: ["John F. Kennedy Jr.", "Michael J. Berman"], src: ["aolberman"] },
  { date: "1997-06", title: "Berman steps aside", text: "Berman sells his stake and moves to a new film and TV division at Hachette. Sources give 1997 or 1998 for his final exit.", people: ["Michael J. Berman"], src: ["aolberman"] },
  { date: "1997-08-11", title: "\"Poster boys for bad behavior\"", text: "Newspapers pick up the September editor's letter, in which Kennedy rebukes two cousins, and its photo of him apparently nude.", people: ["John F. Kennedy Jr."], src: ["seattle97", "cnn97"] },
  { date: "1998-03", title: "Spy takes aim", text: "In its final issue, Spy runs a long takedown arguing politics and pop culture overlap in too few ways to fill a magazine, and that George scrambled for glamorous cover stars and worked out the politics afterwards.", people: [], src: ["spy98", "wiki"] },
  { date: "1999-07-16", title: "Kennedy dies", text: "John F. Kennedy Jr., his wife Carolyn Bessette-Kennedy and her sister Lauren Bessette are killed when the plane he is flying crashes off Martha's Vineyard.", people: ["John F. Kennedy Jr."], src: ["wiki"] },
  { date: "1999-10", title: "Hachette takes over; Lalli edits", text: "Hachette buys the half it didn't own from the Kennedy estate and installs Frank Lalli, formerly of Money magazine, as editor.", people: ["Frank Lalli", "Jack Kliger"], src: ["wiki", "aolclose"] },
  { date: "2001-01-04", title: "George folds", text: "Hachette's Jack Kliger announces the closure, with a final tribute issue due in March. 39 staff get severance; Hachette had put \"well over\" $10 million into the magazine in the past year.", people: ["Jack Kliger"], src: ["abc01", "aolclose", "cnn01"] }
];

// Interviews Kennedy did or pursued that aren't tied to one issue above.
window.GEORGE.interviews = [
  { who: "Fidel Castro", text: "Kennedy did a pre-interview in Cuba and planned to return to talk on the record. When they met he was told it was not an interview and he couldn't bring a tape recorder. It never ran.", src: ["inside", "cbs"] },
  { who: "Louis Farrakhan", text: "Interviewed by Kennedy for George.", src: ["inside", "rg"] },
  { who: "Gerry Adams", text: "Interviewed by Kennedy for George.", src: ["inside"] },
  { who: "Marion Hammer", text: "Kennedy interviewed the head of the National Rifle Association.", src: ["inside"] },
  { who: "Billy Graham", text: "Among the religious leaders Kennedy interviewed.", src: ["rg"] },
  { who: "The Dalai Lama", text: "Among the religious leaders Kennedy interviewed.", src: ["rg"] }
];

// What was happening in Washington while each issue was on sale.
window.GEORGE.context = [
  { date: "1995-11-14", title: "Government shuts down", text: "The first of two shutdowns over the budget fight between Clinton and Gingrich's Congress. The second runs Dec. 16, 1995 to Jan. 6, 1996." },
  { date: "1996-08-12", title: "Party conventions", text: "Republicans nominate Bob Dole in San Diego; Democrats renominate Clinton in Chicago two weeks later." },
  { date: "1996-11-05", title: "Clinton re-elected", text: "Clinton beats Bob Dole and Ross Perot." },
  { date: "1997-01-20", title: "Second inauguration", text: "Clinton begins his second term." },
  { date: "1998-01-21", title: "The Lewinsky story breaks", text: "Reports that Clinton had an affair with a White House intern dominate the year." },
  { date: "1998-11-03", title: "Midterms; Gingrich quits", text: "Democrats gain House seats. Speaker Newt Gingrich resigns days later." },
  { date: "1998-12-19", title: "Clinton impeached", text: "The House approves two articles of impeachment." },
  { date: "1999-02-12", title: "Senate acquits", text: "Clinton is acquitted on both articles." },
  { date: "2000-07-31", title: "Conventions 2000", text: "Republicans nominate George W. Bush in Philadelphia; Democrats nominate Al Gore in Los Angeles in mid-August." },
  { date: "2000-11-07", title: "Election night", text: "Bush vs. Gore comes down to Florida." },
  { date: "2000-12-12", title: "Bush v. Gore", text: "The Supreme Court ends the Florida recount." },
  { date: "2001-01-20", title: "Bush inaugurated", text: "George W. Bush becomes the 43rd president." }
];

// After the magazine closed. Shown in the sidebar rather than on the timeline.
window.GEORGE.after = [
  { date: "2005-10", title: "Harvard looks back", text: "The Kennedy School marks ten years since the launch with a panel, \"Not Just Politics as Usual\", moderated by Tom Brokaw.", src: ["harvard05"] },
  { date: "2022-02", title: "A $3,500 back issue", text: "The February 1997 issue, with Kennedy's Bill Gates interview, becomes a QAnon collectible listed for thousands of dollars.", src: ["vice"] },
  { date: "2022-10", title: "A new George", text: "The photographer Gene Ho, who shot Donald Trump's 2016 campaign, starts publishing a magazine under the George name and slogan, with an editorial line far from the original. Reporting questions whether he holds any rights to the name.", src: ["beast", "lavoce"] }
];
