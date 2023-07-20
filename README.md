# Sinatra: Stateful Instantaneous Updates for Commercial Browsers Through Multi-Version eXecution

Browsers are the main way in which most users experience the internet, which makes them a prime target for malicious entities. The best defense for the common user is to keep their browser always up-to-date, installing updates as soon as they are available. Unfortunately, updating a browser is disruptive as it results in loss of user state. Even though modern browsers reopen all pages (tabs) after an update to minimize inconvenience, this approach still loses all local user state in each page (e.g., contents of unsubmitted forms, including associated JavaScript validation state) and assumes that pages can be refreshed and result in the same contents. We believe this is an important barrier that keeps users from updating their browsers as frequently as possible.

Sinatra supports instantaneous browser updates that do not result in any data loss through a novel Multi-Version eXecution (MVX) approach for JavaScript programs, combined with a sophisticated proxy. Sinatra works in pure JavaScript, does not require any browser support, thus works on closed-source browsers, and requires trivial changes to each target page, that can be automated. First, Sinatra captures all the non-determinism available to a JavaScript program (e.g., event handlers executed, expired timers, invocations of Math.random). Our evaluation shows that Sinatra requires 6MB to store such events, and the memory grows at a modest rate of 253KB/s as the user keeps interacting with each page. When an update becomes available, Sinatra transfer the state by re-executing the same set of non-deterministic events on the new browser. During this time, which can be as long as 1.5 seconds, Sinatra uses MVX to allow the user to keep interacting with the old browser. Finally, Sinatra changes the roles in less than 10ms, and the user starts interacting with the new browser, effectively performing a browser update with zero downtime and no loss of state.

## Research paper

https://drops.dagstuhl.de/opus/volltexte/2023/18219/

## Artifact

https://doi.org/10.5281/zenodo.7647069
