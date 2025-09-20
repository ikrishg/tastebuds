<div align="center">
<div><img src="https://github.com/kkrishguptaa/tastebuds/raw/main/public/favicon.svg" alt="Tastebuds logo" width="96" height="96"></div>
<h1>Tastebuds</h1>
<p>One line AI-generated description of your recent music taste 💄</p>
</div>

## Try it out

> [!WARNING]
> Spotify made it such that, Indie developers can't publish their apps. So, only me and 25 people invited by me can use this app.
> If you want to try it out, you can ask me for an invite with your spotify email address. I will send you an invite, and you can use the app.

[![Live Demo](https://github.com/user-attachments/assets/f5ddc02e-5ac6-4f9d-85ab-9d31476e7ea5)](https://spotbuds.krishg.com)

Here's the live demo of the app. You can try it out, but you need to have a Spotify account and be invited by me to use it.

**Live Demo:** [spotbuds.krishg.com](https://spotbuds.krishg.com)

## How this works

1. The home page has a button to connect your Spotify account.
2. When you click the button, it redirects you to Spotify's authorization page.
3. After you authorize the app, it redirects you back to an auth page.
4. The auth page stores the access token in the browser's local storage.
5. There is a button to move to the results page.
6. The results page fetches your Spotify data using the access token.
7. It analyzes your data and generates a witty description of your music taste.
8. It uses ai.hackclub.com to generate the description.

## How to run this locally

1. Clone the repository: `git clone https://github.com/kkrishguptaa/spotbuds.git`
2. Navigate to the project directory: `cd spotbuds`
3. Open the `index.html` file in your browser through a local server (e.g., using `live-server` or any other static server).
4. Create a spotify app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications).
5. In `config.js`, add a spotify client ID and redirect URI.

**NOTE:** The redirect URI should be the URL of your local server, e.g., `http://localhost:3000/auth`, the auth path is mandatory. This should be the redirect URI in both the Spotify Developer Dashboard and in `config.js`.
