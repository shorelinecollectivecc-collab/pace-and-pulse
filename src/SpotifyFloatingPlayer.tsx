import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import "./SpotifyFloatingPlayer.css";

const spotifyClientId =
  import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? "";

const spotifyRedirectUri =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI?.trim() ??
  `${window.location.origin}/`;

const spotifyScopes = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
].join(" ");

const tokenStorageKey = "pace-pulse-spotify-token";
const verifierStorageKey = "pace-pulse-spotify-verifier";
const stateStorageKey = "pace-pulse-spotify-state";

export type SpotifyAnnotationTrack = {
  id: string;
  uri: string;
  name: string;
  artist: string;
  durationMs: number;
  artwork: string;
};

type SpotifyToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

type SpotifyImage = {
  url: string;
};

type SpotifyArtist = {
  name: string;
};

type SpotifyTrack = {
  id: string | null;
  uri: string;
  name: string;
  duration_ms: number;
  album: {
    name: string;
    images: SpotifyImage[];
  };
  artists: SpotifyArtist[];
};

type SpotifyPlaybackState = {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: SpotifyTrack;
  };
};

type SpotifyPlayerError = {
  message: string;
};

type SpotifyPlayer = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  activateElement: () => Promise<void>;
  togglePlay: () => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  addListener: (
    event:
      | "ready"
      | "not_ready"
      | "player_state_changed"
      | "initialization_error"
      | "authentication_error"
      | "account_error"
      | "playback_error"
      | "autoplay_failed",
    callback: (payload: never) => void
  ) => boolean;
};

type SpotifySdk = {
  Player: new (options: {
    name: string;
    getOAuthToken: (callback: (token: string) => void) => void;
    volume?: number;
    enableMediaSession?: boolean;
  }) => SpotifyPlayer;
};

type SpotifySearchTrack = {
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  album: {
    name: string;
    images: SpotifyImage[];
  };
  artists: SpotifyArtist[];
};

type SpotifySearchResponse = {
  tracks?: {
    items?: SpotifySearchTrack[];
  };
};

declare global {
  interface Window {
    Spotify?: SpotifySdk;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

type SpotifyFloatingPlayerProps = {
  onUseForAnnotation: (track: SpotifyAnnotationTrack) => void;
};

type FloatingPosition = {
  x: number;
  y: number;
};

const playerPositionStorageKey =
  "pace-pulse-spotify-player-position";

function readSavedPlayerPosition(): FloatingPosition | null {
  try {
    const saved = localStorage.getItem(playerPositionStorageKey);

    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved) as Partial<FloatingPosition>;

    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number"
    ) {
      return null;
    }

    return {
      x: Math.max(8, parsed.x),
      y: Math.max(8, parsed.y),
    };
  } catch {
    return null;
  }
}

function readStoredToken(): SpotifyToken | null {
  try {
    const saved = localStorage.getItem(tokenStorageKey);

    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved) as Partial<SpotifyToken>;

    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    return parsed as SpotifyToken;
  } catch {
    return null;
  }
}

function saveToken(token: SpotifyToken | null) {
  if (!token) {
    localStorage.removeItem(tokenStorageKey);
    return;
  }

  localStorage.setItem(tokenStorageKey, JSON.stringify(token));
}

function toBase64Url(bytes: Uint8Array) {
  let value = "";

  bytes.forEach((byte) => {
    value += String.fromCharCode(byte);
  });

  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function makeRandomValue(length = 64) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

async function createCodeChallenge(verifier: string) {
  const bytes = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toBase64Url(new Uint8Array(digest));
}

function formatTime(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "0:00";
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function trackToAnnotation(
  track: SpotifyTrack | SpotifySearchTrack
): SpotifyAnnotationTrack {
  return {
    id: track.id ?? "",
    uri: track.uri,
    name: track.name,
    artist: track.artists.map((artist) => artist.name).join(", "),
    durationMs: track.duration_ms,
    artwork: track.album.images[0]?.url ?? "",
  };
}

export default function SpotifyFloatingPlayer({
  onUseForAnnotation,
}: SpotifyFloatingPlayerProps) {
  const [expanded, setExpanded] = useState(false);
  const [token, setToken] = useState<SpotifyToken | null>(
    readStoredToken
  );
  const [deviceId, setDeviceId] = useState("");
  const [connected, setConnected] = useState(false);
  const [currentTrack, setCurrentTrack] =
    useState<SpotifyAnnotationTrack | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = Number(
      localStorage.getItem("pace-pulse-spotify-volume")
    );

    return Number.isFinite(saved) ? Math.min(Math.max(saved, 0), 1) : 0.55;
  });
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    SpotifyAnnotationTrack[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [floatingPosition, setFloatingPosition] =
    useState<FloatingPosition | null>(readSavedPlayerPosition);
  const [dragging, setDragging] = useState(false);
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const playerShellRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const isConfigured = Boolean(spotifyClientId);

  const refreshAccessToken = useCallback(
    async (current: SpotifyToken) => {
      const body = new URLSearchParams({
        client_id: spotifyClientId,
        grant_type: "refresh_token",
        refresh_token: current.refreshToken,
      });

      const response = await fetch(
        "https://accounts.spotify.com/api/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        }
      );

      if (!response.ok) {
        throw new Error("spotify needs to reconnect");
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      const nextToken: SpotifyToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? current.refreshToken,
        expiresAt: Date.now() + data.expires_in * 1000,
      };

      saveToken(nextToken);
      setToken(nextToken);
      return nextToken.accessToken;
    },
    []
  );

  const getAccessToken = useCallback(async () => {
    const current = readStoredToken();

    if (!current) {
      return "";
    }

    if (current.expiresAt > Date.now() + 60_000) {
      return current.accessToken;
    }

    try {
      return await refreshAccessToken(current);
    } catch {
      saveToken(null);
      setToken(null);
      setConnected(false);
      setMessage("spotify needs to reconnect");
      return "";
    }
  }, [refreshAccessToken]);

  const spotifyFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error("connect spotify first");
      }

      const response = await fetch(
        `https://api.spotify.com/v1${path}`,
        {
          ...init,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(init?.headers ?? {}),
          },
        }
      );

      if (!response.ok && response.status !== 204) {
        throw new Error("spotify could not complete that");
      }

      return response;
    },
    [getAccessToken]
  );

  const connectSpotify = useCallback(async () => {
    if (!spotifyClientId) {
      setExpanded(true);
      return;
    }

    const verifier = makeRandomValue(64);
    const state = makeRandomValue(24);
    const challenge = await createCodeChallenge(verifier);

    sessionStorage.setItem(verifierStorageKey, verifier);
    sessionStorage.setItem(stateStorageKey, state);

    const parameters = new URLSearchParams({
      client_id: spotifyClientId,
      response_type: "code",
      redirect_uri: spotifyRedirectUri,
      scope: spotifyScopes,
      code_challenge_method: "S256",
      code_challenge: challenge,
      state,
    });

    window.location.assign(
      `https://accounts.spotify.com/authorize?${parameters.toString()}`
    );
  }, []);

  const disconnectSpotify = useCallback(() => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    saveToken(null);
    setToken(null);
    setConnected(false);
    setDeviceId("");
    setCurrentTrack(null);
    setSearchResults([]);
    setMessage("spotify disconnected");
  }, []);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const code = parameters.get("code");
    const returnedState = parameters.get("state");
    const spotifyError = parameters.get("error");

    if (!code && !spotifyError) {
      return;
    }

    const authorizationCode = code;
    const cleanUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanUrl);

    if (spotifyError) {
      setMessage("spotify connection was cancelled");
      setExpanded(true);
      return;
    }

    const verifier = sessionStorage.getItem(verifierStorageKey);
    const expectedState = sessionStorage.getItem(stateStorageKey);

    if (
      !authorizationCode ||
      !verifier ||
      !returnedState ||
      returnedState !== expectedState
    ) {
      setMessage("spotify connection could not be verified");
      setExpanded(true);
      return;
    }

    sessionStorage.removeItem(verifierStorageKey);
    sessionStorage.removeItem(stateStorageKey);

    void (async () => {
      try {
        const body = new URLSearchParams({
          client_id: spotifyClientId,
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: spotifyRedirectUri,
          code_verifier: verifier,
        });

        const response = await fetch(
          "https://accounts.spotify.com/api/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
          }
        );

        if (!response.ok) {
          throw new Error("spotify could not finish connecting");
        }

        const data = (await response.json()) as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };

        const nextToken: SpotifyToken = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: Date.now() + data.expires_in * 1000,
        };

        saveToken(nextToken);
        setToken(nextToken);
        setExpanded(true);
        setMessage("spotify connected");
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "spotify could not finish connecting"
        );
        setExpanded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!token || !isConfigured || playerRef.current) {
      return;
    }

    let cancelled = false;

    const initialisePlayer = () => {
      if (cancelled || !window.Spotify || playerRef.current) {
        return;
      }

      const player = new window.Spotify.Player({
        name: "pace & pulse",
        volume,
        enableMediaSession: true,
        getOAuthToken: (callback) => {
          void getAccessToken().then((accessToken) => {
            if (accessToken) {
              callback(accessToken);
            }
          });
        },
      });

      player.addListener("ready", ((payload: {
        device_id: string;
      }) => {
        setDeviceId(payload.device_id);
        setConnected(true);
        setMessage("ready to play");

        void getAccessToken().then((accessToken) => {
          if (!accessToken) {
            return;
          }

          void fetch("https://api.spotify.com/v1/me/player", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              device_ids: [payload.device_id],
              play: false,
            }),
          });
        });
      }) as (payload: never) => void);

      player.addListener("not_ready", (() => {
        setConnected(false);
        setMessage("spotify player is resting");
      }) as (payload: never) => void);

      player.addListener("player_state_changed", ((state:
        | SpotifyPlaybackState
        | null) => {
        if (!state) {
          return;
        }

        const track = state.track_window.current_track;
        setCurrentTrack(trackToAnnotation(track));
        setIsPaused(state.paused);
        setPosition(state.position);
        setDuration(state.duration || track.duration_ms);
      }) as (payload: never) => void);

      const handlePlayerError = (payload: SpotifyPlayerError) => {
        setMessage(payload.message.toLowerCase());
        setExpanded(true);
      };

      player.addListener(
        "initialization_error",
        handlePlayerError as (payload: never) => void
      );
      player.addListener(
        "authentication_error",
        handlePlayerError as (payload: never) => void
      );
      player.addListener(
        "account_error",
        (() => {
          setMessage("spotify premium is needed for playback");
          setExpanded(true);
        }) as (payload: never) => void
      );
      player.addListener(
        "playback_error",
        handlePlayerError as (payload: never) => void
      );
      player.addListener(
        "autoplay_failed",
        (() => {
          setMessage("tap play once to wake the player");
        }) as (payload: never) => void
      );

      playerRef.current = player;
      void player.connect();
    };

    if (window.Spotify) {
      initialisePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initialisePlayer;

      if (
        !document.querySelector(
          'script[src="https://sdk.scdn.co/spotify-player.js"]'
        )
      ) {
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
    // volume is applied through changeVolume without rebuilding the player
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAccessToken, isConfigured, token]);

  useEffect(() => {
    if (isPaused || !currentTrack) {
      return;
    }

    const timer = window.setInterval(() => {
      setPosition((current) =>
        Math.min(current + 1000, duration || currentTrack.durationMs)
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentTrack, duration, isPaused]);

  const keepPlayerOnScreen = useCallback(
    (nextPosition: FloatingPosition) => {
      const shell = playerShellRef.current;
      const width = shell?.offsetWidth ?? 360;
      const height = shell?.offsetHeight ?? 70;
      const maximumX = Math.max(8, window.innerWidth - width - 8);
      const maximumY = Math.max(8, window.innerHeight - height - 8);

      return {
        x: Math.min(Math.max(8, nextPosition.x), maximumX),
        y: Math.min(Math.max(8, nextPosition.y), maximumY),
      };
    },
    []
  );

  const saveFloatingPosition = useCallback(
    (nextPosition: FloatingPosition) => {
      const safePosition = keepPlayerOnScreen(nextPosition);
      setFloatingPosition(safePosition);
      localStorage.setItem(
        playerPositionStorageKey,
        JSON.stringify(safePosition)
      );
    },
    [keepPlayerOnScreen]
  );

  useEffect(() => {
    function keepSavedPositionVisible() {
      setFloatingPosition((current) => {
        if (!current) {
          return current;
        }

        const safePosition = keepPlayerOnScreen(current);
        localStorage.setItem(
          playerPositionStorageKey,
          JSON.stringify(safePosition)
        );
        return safePosition;
      });
    }

    window.addEventListener("resize", keepSavedPositionVisible);
    const frame = window.requestAnimationFrame(
      keepSavedPositionVisible
    );

    return () => {
      window.removeEventListener(
        "resize",
        keepSavedPositionVisible
      );
      window.cancelAnimationFrame(frame);
    };
  }, [expanded, keepPlayerOnScreen]);

  function startDragging(
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    if (event.button !== 0) {
      return;
    }

    const shell = playerShellRef.current;

    if (!shell) {
      return;
    }

    const bounds = shell.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function moveWhileDragging(
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const nextPosition = keepPlayerOnScreen({
      x: event.clientX - drag.offsetX,
      y: event.clientY - drag.offsetY,
    });

    setFloatingPosition(nextPosition);
  }

  function stopDragging(
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    setDragging(false);

    if (floatingPosition) {
      saveFloatingPosition(floatingPosition);
    }
  }

  function moveWithKeyboard(
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) {
    const movement = event.shiftKey ? 30 : 10;
    const shell = playerShellRef.current;
    const bounds = shell?.getBoundingClientRect();

    if (!bounds) {
      return;
    }

    const current = floatingPosition ?? {
      x: bounds.left,
      y: bounds.top,
    };

    const movementByKey: Record<
      string,
      FloatingPosition | undefined
    > = {
      ArrowLeft: { x: -movement, y: 0 },
      ArrowRight: { x: movement, y: 0 },
      ArrowUp: { x: 0, y: -movement },
      ArrowDown: { x: 0, y: movement },
    };
    const change = movementByKey[event.key];

    if (!change) {
      return;
    }

    event.preventDefault();
    saveFloatingPosition({
      x: current.x + change.x,
      y: current.y + change.y,
    });
  }

  async function playTrack(track: SpotifyAnnotationTrack) {
    if (!deviceId) {
      setMessage("wait for the spotify player to become ready");
      return;
    }

    try {
      await playerRef.current?.activateElement();
      await spotifyFetch(
        `/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [track.uri],
          }),
        }
      );
      setCurrentTrack(track);
      setDuration(track.durationMs);
      setPosition(0);
      setIsPaused(false);
      setSearchResults([]);
      setQuery("");
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "spotify could not play that track"
      );
    }
  }

  async function searchSpotify(event: FormEvent) {
    event.preventDefault();

    if (!query.trim()) {
      return;
    }

    setSearching(true);
    setMessage("");

    try {
      const response = await spotifyFetch(
        `/search?q=${encodeURIComponent(query.trim())}&type=track&limit=6`
      );
      const data = (await response.json()) as SpotifySearchResponse;
      const tracks = data.tracks?.items ?? [];
      setSearchResults(tracks.map(trackToAnnotation));

      if (tracks.length === 0) {
        setMessage("no tracks found yet");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "spotify search could not load"
      );
    } finally {
      setSearching(false);
    }
  }

  async function togglePlayback() {
    if (!playerRef.current) {
      setExpanded(true);
      return;
    }

    await playerRef.current.activateElement();
    await playerRef.current.togglePlay();
  }

  async function changeVolume(nextVolume: number) {
    setVolume(nextVolume);
    localStorage.setItem(
      "pace-pulse-spotify-volume",
      String(nextVolume)
    );
    await playerRef.current?.setVolume(nextVolume);
  }

  const playerProgress = useMemo(() => {
    if (!duration) {
      return 0;
    }

    return Math.min((position / duration) * 100, 100);
  }, [duration, position]);

  return (
    <aside
      ref={playerShellRef}
      className={
        [
          "spotify-floating-player",
          expanded ? "spotify-player-open" : "",
          dragging ? "spotify-player-dragging" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
      aria-label="spotify music player"
      style={
        floatingPosition
          ? ({
              left: floatingPosition.x,
              top: floatingPosition.y,
              right: "auto",
              bottom: "auto",
            } as CSSProperties)
          : undefined
      }
    >
      <button
        className="spotify-drag-handle"
        type="button"
        aria-label="move spotify player"
        title="drag to move"
        onPointerDown={startDragging}
        onPointerMove={moveWhileDragging}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onKeyDown={moveWithKeyboard}
      >
        ⠿
      </button>

      <div className="spotify-player-compact">
        <button
          className="spotify-player-art"
          type="button"
          aria-label={
            expanded ? "make spotify player smaller" : "open spotify player"
          }
          onClick={() => setExpanded((current) => !current)}
        >
          {currentTrack?.artwork ? (
            <img src={currentTrack.artwork} alt="" />
          ) : (
            <img src="/icons/pace-pulse-logo.png" alt="" />
          )}
        </button>

        <button
          className="spotify-track-copy"
          type="button"
          onClick={() => setExpanded((current) => !current)}
        >
          <strong>
            {currentTrack?.name ??
              (token ? "spotify is ready" : "connect spotify")}
          </strong>
          <small>
            {currentTrack?.artist ?? "music, softly within reach"}
          </small>
        </button>

        {token ? (
          <div className="spotify-mini-controls">
            <button
              type="button"
              aria-label="previous track"
              disabled={!connected}
              onClick={() => playerRef.current?.previousTrack()}
            >
              ‹
            </button>
            <button
              className="spotify-main-control"
              type="button"
              aria-label={isPaused ? "play" : "pause"}
              disabled={!connected}
              onClick={() => void togglePlayback()}
            >
              {isPaused ? "▶" : "Ⅱ"}
            </button>
            <button
              type="button"
              aria-label="next track"
              disabled={!connected}
              onClick={() => playerRef.current?.nextTrack()}
            >
              ›
            </button>
          </div>
        ) : (
          <button
            className="spotify-connect-button"
            type="button"
            onClick={() => void connectSpotify()}
          >
            connect
          </button>
        )}

        <button
          className="spotify-expand-button"
          type="button"
          aria-label={
            expanded ? "make spotify player smaller" : "open spotify player"
          }
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "⌄" : "⌃"}
        </button>

        <div className="spotify-mini-progress">
          <span style={{ width: `${playerProgress}%` }} />
        </div>
      </div>

      {expanded && (
        <div className="spotify-player-details">
          {!isConfigured && (
            <div className="spotify-connect-panel spotify-setup-panel">
              <p>
                spotify needs its client id before it can connect
              </p>
            </div>
          )}

          {isConfigured && !token && (
            <div className="spotify-connect-panel">
              <p>
                connect your premium spotify account to play music inside
                pace &amp; pulse
              </p>
              <button
                type="button"
                onClick={() => void connectSpotify()}
              >
                connect spotify
              </button>
            </div>
          )}

          {token && (
            <>
              <form
                className="spotify-search"
                onSubmit={(event) => void searchSpotify(event)}
              >
                <input
                  value={query}
                  placeholder="find a track or artist"
                  aria-label="find a spotify track"
                  onChange={(event) => setQuery(event.target.value)}
                />
                <button type="submit" disabled={searching}>
                  {searching ? "looking..." : "find"}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="spotify-search-results">
                  {searchResults.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => void playTrack(track)}
                    >
                      {track.artwork ? (
                        <img src={track.artwork} alt="" />
                      ) : (
                        <span>♪</span>
                      )}
                      <span>
                        <strong>{track.name}</strong>
                        <small>{track.artist}</small>
                      </span>
                      <small>{formatTime(track.durationMs)}</small>
                    </button>
                  ))}
                </div>
              )}

              <div className="spotify-time-row">
                <span>{formatTime(position)}</span>
                <input
                  type="range"
                  min="0"
                  max={Math.max(duration, 1)}
                  step="1000"
                  value={Math.min(position, Math.max(duration, 1))}
                  aria-label="track position"
                  onChange={(event) => {
                    const nextPosition = Number(event.target.value);
                    setPosition(nextPosition);
                    void playerRef.current?.seek(nextPosition);
                  }}
                />
                <span>{formatTime(duration)}</span>
              </div>

              <div className="spotify-player-footer">
                <label>
                  <span>volume</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(event) =>
                      void changeVolume(Number(event.target.value))
                    }
                  />
                </label>

                {currentTrack && (
                  <button
                    className="spotify-use-button"
                    type="button"
                    onClick={() =>
                      onUseForAnnotation(currentTrack)
                    }
                  >
                    use for annotation
                  </button>
                )}

                <button
                  className="spotify-disconnect-button"
                  type="button"
                  onClick={disconnectSpotify}
                >
                  disconnect
                </button>
              </div>
            </>
          )}

          {isConfigured && message && (
            <p className="spotify-player-message">{message}</p>
          )}
        </div>
      )}
    </aside>
  );
}
