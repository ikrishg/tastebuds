import { Window } from "~/components/Window";
import { apiKey } from "~/config";

export default function Home() {
  return (
    <>
      <Window>
        <h1>Welcome to Tastebuds</h1>
        <p>
          You need a last.fm account to use this! Tastebuds rates your taste in
          music and gives you a Music Vibe Title.
        </p>
        <p>
          Tastebuds was built by <a href="https://krishg.com">Krish Gupta</a>.
        </p>
        <div class="button-container">
          <a href={`http://www.last.fm/api/auth/?api_key=${apiKey}`}>
            <button class="button">login with last.fm!</button>
          </a>
        </div>
      </Window>
    </>
  );
}
