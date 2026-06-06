# InterviewCodeShare

InterviewCodeShare is a simple app intended for basic code sharing for use in conjunction with Microsoft Teams interviews. The intention is to provide direct P2P connections for code sharing using WebRTC. The reality is firewalls may block direct P2P connections, or there may be certain settings preventing users from interacting with apps in meetings. A fallback option is available, allowing interviewers to generate URLs to provide to candidates so they can access directly in their browser.

A direct UDP connection is attempted for code sharing through an open relay STUN server. If unavailable a TURN server is used to handle streaming connection data between peers. When utilized the TURN server routes packets securely through pre-encrypted DTLS-SRTP protocols, it cannot decrypt or view any data exchanged between peers. The publicly available open relay TURN servers are used by default for this, and require the interviewer to enter username/credential information on the main config page when starting an interview. Open relay offers free account options, with more details available at [https://dashboard.metered.ca/signup](https://dashboard.metered.ca/signup).

Microsoft Teams Apps do require an externally accessible HTTPS endpoint, so the UI for the app will be hosted from GitHub Pages to satisfy this requirement. This is also the base URL utilized as part of the fallback option if needed.

# Table of Contents

* [Features](#features)
* [Development](#development)
* [Author](#author)

## Features

The main features are fairly basic right now. Users can select from a few languages (which will persist across all shared connections). Additionally users can change themes (which are not persisted, since different users may want different themes).

The code editor itself is the [Monaco Editor](https://microsoft.github.io/monaco-editor/). It has a very basic configuration right now, which provides syntax colorization and minimal syntax error highlighting depending on selected language.

## Development

If developing locally you may utilize the included peerjs dependency for handling p2p connections, instead of having to rely on open relay servers. After running the usual `npm i` to install dependencies, you can utilize `npm start` to start the angular app, and `npm run start:peer` to start a local peerjs instance.

> NOTE: Be sure to utilize 2 different browsers or a new and private tab if using the same browser to ensure proper p2p connection can be established locally.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.0. More specifics on Node and npm included below:

* Angular CLI       : 22.0.0
* Angular           : 22.0.0
* Node.js           : 24.16.0
* Package Manager   : npm 11.13.0

## Author

* **[Jonathan Phillips]** - (https://github.com/jphillips03)
