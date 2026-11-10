# By George: a George magazine timeline

An interactive timeline of *George*, the politics-meets-pop-culture monthly John F. Kennedy Jr. founded in 1995: all 57 issues from the Oct/Nov 1995 premiere (Cindy Crawford as George Washington) to the 2001 farewell issue, plus Kennedy's interviews, the magazine's own history, and what was happening in Washington while each issue was on sale.

Same idea as Longbox in the folder above, rebuilt for one magazine. No build step: open `index.html`, or serve the folder and visit it.

## What you can do

- **Timeline**: covers, Kennedy's interviews, company milestones and Washington events in four lanes on one time axis. Scroll to move, Ctrl/⌘ + scroll or the slider to zoom, **Whole run** to fit all six years. A red line marks July 16, 1999.
- **Covers**: every issue as a cover, grouped by year.
- **People**: everyone who appeared on a cover, inside, or behind the scenes. **Follow** a person to light up their issues.
- **How sure**: every cover is marked *Confirmed* (named in news coverage), *Reported* (from resale listings only) or *Not identified*, and lists its sources.
- **Cover images**: each issue has a **Search Google Images** button. Drop, paste or upload the cover you find, or paste an image link. Edits stay in your browser; **Your edits** copies them out so they can go into `data.js`.

## Files

| File | Contents |
| --- | --- |
| `data.js` | Issues, history, interviews, Washington context, sources |
| `app.js` | The app |
| `styles.css` | Styles |
| `build-artifact.mjs` | Packs everything into one HTML page (`node build-artifact.mjs out.html`) |

## About the data

Researched from news coverage (Spokesman-Review, Seattle Times, CNN, ABC News, People, Today, Vice), Wikipedia, an Internet Archive scan, and back-issue listings. 15 covers are confirmed, 40 come from listings only, and two are still unidentified (Sep 1998, Dec 2000/Jan 2001). The farewell issue is dated March 2001, per CNN and ABC News reports of the closure.

Two real covers are bundled in `covers/`: the premiere (from Wikipedia) and February 1997 (from the Internet Archive scan). Other issues show a drawn cover. To add one, put the image in `covers/` and set `img: "covers/<date>.jpg"` on the issue, or use any image URL.
