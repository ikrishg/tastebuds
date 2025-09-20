// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          <link
            href="https://cdn.jsdelivr.net/npm/reseter.css@2.0.0/css/reseter.min.css"
            rel="stylesheet"
          />
          <title>Find Your Music Vibe • Music Rating • Tastebuds</title>
          <meta
            name="title"
            content="Find Your Music Vibe • Music Rating • Tastebuds"
          />
          <meta
            name="description"
            content="What does your Music activity says about you? Are you a melancholic or a partyholic? Find your music taste with Tastebuds"
          />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://tastebuds.krishg.com/" />
          <meta
            property="og:title"
            content="Find Your Music Vibe • Music Rating • Tastebuds"
          />
          <meta
            property="og:description"
            content="What does your Music activity says about you? Are you a melancholic or a partyholic? Find your music taste with Tastebuds."
          />
          <meta
            property="og:image"
            content="https://tastebuds.krishg.com/cover.png"
          />
          <meta property="twitter:card" content="summary_large_image" />
          <meta property="twitter:url" content="https://tastebuds.krishg.com" />
          <meta
            property="twitter:title"
            content="Find Your Music Vibe • Music Rating • Tastebuds"
          />
          <meta
            property="twitter:description"
            content="What does your Music activity says about you? Are you a melancholic or a partyholic? Find your music taste with Tastebuds."
          />
          <meta
            property="twitter:image"
            content="https://tastebuds.krishg.com/cover.png"
          />
          <link
            rel="icon"
            type="image/png"
            href="/favicon-96x96.png"
            sizes="96x96"
          />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="shortcut icon" href="/favicon.ico" />
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/apple-touch-icon.png"
          />
          <meta name="apple-mobile-web-app-title" content="Tastebuds" />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
