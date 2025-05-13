"use client";

import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { generateRandomString, generateCodeChallenge } from "@/lib/pkce";
import {
  determineUserLeagues,
  getPrimaryLeague,
  generateRoleDescription,
} from "@/lib/discord-roles";
import { useRouter } from "next/navigation";

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  roles: string[];
  leagues: string[];
  primaryLeague: string | null;
  roleDescription: string;
}

interface AuthContextType {
  user: DiscordUser | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const REDIRECT_URI =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3000/auth/callback"
    : process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ||
      "https://mitosis-game-alpha.vercel.app/auth/callback";

// Create exponential backoff mechanism
const createBackoffDelay = (
  retryCount: number,
  baseDelay = 1000,
  maxDelay = 10000
) => {
  return Math.min(baseDelay * Math.pow(1.5, retryCount), maxDelay);
};

export function DiscordAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Ref to track if user info fetch is in progress - prevents duplicate requests
  const fetchingUserInfo = useRef(false);
  // Track if login attempt has already been made
  const initialAuthCheckDone = useRef(false);
  // Check if the page is loaded with a code in the callback URL
  const isCallbackUrl = useRef(false);

  // Helper function to check if token is expired
  const isTokenExpired = (expiresAt: number) => {
    return Date.now() >= expiresAt;
  };

  // Fetch user info from Discord API
  const fetchUserInfo = useCallback(
    async (accessToken: string, retries = 0) => {
      // Prevent duplicate requests
      if (fetchingUserInfo.current) {
        console.log("User info fetch already in progress, skipping...");
        return null;
      }

      try {
        fetchingUserInfo.current = true;
        console.log("Fetching user info, attempt:", retries + 1);

        const response = await fetch("/api/auth/user", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          // If we get rate limited (429), wait and retry
          if (response.status === 429 && retries < 3) {
            console.log("Rate limited, waiting to retry...");
            const retryAfter = response.headers.get("Retry-After") || "2";
            const delay = parseInt(retryAfter, 10) * 1000 || 2000;

            await new Promise((resolve) => setTimeout(resolve, delay));
            fetchingUserInfo.current = false;
            return fetchUserInfo(accessToken, retries + 1);
          }

          // If we get server errors (5xx), also retry
          if (response.status >= 500 && response.status < 600 && retries < 3) {
            console.log(
              `Server error (${response.status}), waiting to retry...`
            );
            const delay = createBackoffDelay(retries);

            await new Promise((resolve) => setTimeout(resolve, delay));
            fetchingUserInfo.current = false;
            return fetchUserInfo(accessToken, retries + 1);
          }

          console.error("Failed to fetch user info:", await response.text());
          throw new Error("Failed to fetch user info");
        }

        const userData = await response.json();

        // Make sure roles is always an array
        const roles = Array.isArray(userData.roles) ? userData.roles : [];

        // Determine available leagues based on roles
        const userLeagues = determineUserLeagues(roles);
        const primaryLeague = getPrimaryLeague(userLeagues);

        const userInfo = {
          id: userData.id || "",
          username: userData.username || "",
          avatar: userData.avatar || null,
          roles: roles,
          leagues: userLeagues,
          primaryLeague,
          roleDescription: generateRoleDescription(roles),
        };

        setUser(userInfo);

        // Update component state without page reload
        // Use router.refresh() only when needed in callback handling
        if (isCallbackUrl.current) {
          router.refresh();
          isCallbackUrl.current = false;
        }

        // If this is a new connection, log it for debugging
        console.log("Discord user connected:", userData.username);
        return userInfo;
      } catch (err) {
        console.error("Error fetching user info:", err);

        // Only retry for network errors, not for logical errors
        if (
          retries < 3 &&
          (err instanceof TypeError ||
            (err as any)?.code === "FETCH_ROLES_FAILED")
        ) {
          console.log("Retrying user info fetch after error...");
          await new Promise((resolve) =>
            setTimeout(resolve, createBackoffDelay(retries))
          );
          fetchingUserInfo.current = false;
          return fetchUserInfo(accessToken, retries + 1);
        }

        throw err;
      } finally {
        fetchingUserInfo.current = false;
      }
    },
    [router]
  );

  // Function to refresh access token using refresh token
  const refreshAccessToken = useCallback(
    async (refreshToken: string) => {
      try {
        setIsConnecting(true);
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken, userId: user?.id }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Token refresh failed: ${errorText}`);
        }

        const tokenData = await response.json();

        // Save new tokens
        localStorage.setItem("discord_access_token", tokenData.access_token);
        localStorage.setItem("discord_refresh_token", tokenData.refresh_token);

        // Calculate when the token expires
        const expiresAt = Date.now() + tokenData.expires_in * 1000;
        localStorage.setItem("discord_expires_at", expiresAt.toString());

        // Fetch user info with the new token
        return await fetchUserInfo(tokenData.access_token);
      } catch (err) {
        console.error("Token refresh error:", err);
        // If refresh fails, log out the user
        logout();
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [fetchUserInfo, user?.id]
  );

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem("discord_access_token");
    localStorage.removeItem("discord_refresh_token");
    localStorage.removeItem("discord_expires_at");
    localStorage.removeItem("discord_auth_state");
    localStorage.removeItem("discord_code_verifier");
    setUser(null);

    // Reset API request tracking
    fetchingUserInfo.current = false;
    initialAuthCheckDone.current = false;

    // Refresh only when logging out
    router.refresh();
  }, [router]);

  // Check for existing session on mount and periodically try to fetch user data if needed
  useEffect(() => {
    // Don't try again if login check has already been performed
    if (initialAuthCheckDone.current) {
      return;
    }

    const checkAuth = async () => {
      try {
        setIsConnecting(true);

        // Check callback URL
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          isCallbackUrl.current = !!urlParams.get("code");
        }

        // Check if there's a token in localStorage and if it's not expired
        const accessToken = localStorage.getItem("discord_access_token");
        const expiresAt = Number(
          localStorage.getItem("discord_expires_at") || "0"
        );
        const refreshToken = localStorage.getItem("discord_refresh_token");

        if (!accessToken) {
          setIsInitialized(true);
          initialAuthCheckDone.current = true;
          return;
        }

        // If token is expired, try to refresh it
        if (isTokenExpired(expiresAt) && refreshToken) {
          await refreshAccessToken(refreshToken);
          setIsInitialized(true);
          initialAuthCheckDone.current = true;
          return;
        }

        // If we have a valid token, fetch the user info
        await fetchUserInfo(accessToken);
        setIsInitialized(true);
        initialAuthCheckDone.current = true;
      } catch (err) {
        console.error("Auth check error:", err);
        // Clear tokens if they're invalid
        logout();
        setIsInitialized(true);
        initialAuthCheckDone.current = true;
      } finally {
        setIsConnecting(false);
      }
    };

    checkAuth();
  }, [fetchUserInfo, refreshAccessToken, logout]);

  // Handle Discord OAuth callback - this part should only run during callback processing
  useEffect(() => {
    if (!isInitialized) return;

    // Only execute if there's a code parameter in the URL - prevents unnecessary execution
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (!code) return; // Not a callback if there's no code, so don't process

    isCallbackUrl.current = true; // Mark as callback URL

    const handleCallback = async () => {
      const state = urlParams.get("state");
      const storedState = localStorage.getItem("discord_auth_state");
      const codeVerifier = localStorage.getItem("discord_code_verifier");

      // Clear URL params without refreshing the page
      if (code) {
        const url = new URL(window.location.href);
        url.search = "";
        window.history.replaceState({}, document.title, url.href);
      }

      // If we have a code and the state matches, exchange it for a token
      if (code && state && storedState && state === storedState) {
        try {
          setIsConnecting(true);
          setError(null);

          // This is important for logging
          console.log("Attempting to exchange code for token:");
          console.log(
            "- Code verifier:",
            codeVerifier ? `present (${codeVerifier.length} chars)` : "missing"
          );
          console.log("- State match:", state === storedState);

          // Clean up localStorage
          localStorage.removeItem("discord_auth_state");

          // Exchange code for token
          const tokenResponse = await fetch("/api/auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              codeVerifier,
            }),
          });

          if (!tokenResponse.ok) {
            // For rate limiting, implement a retry logic
            if (tokenResponse.status === 429) {
              const retryAfter =
                tokenResponse.headers.get("Retry-After") || "2";
              const delay = parseInt(retryAfter, 10) * 1000 || 2000;

              setError(
                `Rate limited by Discord. Retrying automatically in ${Math.ceil(
                  delay / 1000
                )} seconds...`
              );

              // Wait and retry
              await new Promise((resolve) => setTimeout(resolve, delay));
              handleCallback();
              return;
            }

            const errorData = await tokenResponse
              .json()
              .catch(() => ({ error: "Failed to parse error response" }));
            throw new Error(
              `Token exchange failed: ${
                errorData.error || tokenResponse.statusText
              }`
            );
          }

          const tokenData = await tokenResponse.json();

          // Save tokens
          localStorage.setItem("discord_access_token", tokenData.access_token);
          localStorage.setItem(
            "discord_refresh_token",
            tokenData.refresh_token
          );

          // Calculate when the token expires
          const expiresAt = Date.now() + tokenData.expires_in * 1000;
          localStorage.setItem("discord_expires_at", expiresAt.toString());

          // Now remove the code verifier as it's no longer needed
          localStorage.removeItem("discord_code_verifier");

          // Fetch user info with the new token
          await fetchUserInfo(tokenData.access_token);

          // Refresh only needed after callback processing
          router.refresh();
        } catch (err) {
          console.error("Auth callback error:", err);
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Authentication failed");
          }
          logout();
        } finally {
          setIsConnecting(false);
          isCallbackUrl.current = false;
        }
      }
    };

    handleCallback();
  }, [isInitialized, fetchUserInfo, logout, router]);

  // Refresh user roles - only called by explicit user request
  const refreshRoles = async () => {
    try {
      setIsConnecting(true);
      const accessToken = localStorage.getItem("discord_access_token");
      if (!accessToken) {
        throw new Error("Not logged in");
      }

      await fetchUserInfo(accessToken);
      // UI update needed when refreshing roles
      router.refresh();
    } catch (err) {
      console.error("Role refresh error:", err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  // Login function with improved error handling
  const login = () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Generate PKCE code verifier and challenge
      const codeVerifier = generateRandomString(128);

      // Generate state parameter
      const state = generateRandomString(40);
      localStorage.setItem("discord_auth_state", state);
      localStorage.setItem("discord_code_verifier", codeVerifier);

      console.log("Starting login process:");
      console.log(
        "- Generated code verifier:",
        codeVerifier
          ? `${codeVerifier.substring(0, 10)}... (${codeVerifier.length} chars)`
          : "none"
      );
      console.log(
        "- Generated state:",
        state ? `${state.substring(0, 10)}... (${state.length} chars)` : "none"
      );
      console.log("- Using redirect URI:", REDIRECT_URI);

      // Generate the code challenge from the verifier
      generateCodeChallenge(codeVerifier)
        .then((codeChallenge) => {
          // Construct auth URL
          const baseUrl = "https://discord.com/api/oauth2/authorize";
          const params = new URLSearchParams({
            client_id:
              process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
              "1088729716317495367",
            redirect_uri: REDIRECT_URI,
            response_type: "code",
            scope: "identify guilds guilds.members.read",
            state,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            // Add prompt parameter to ensure Discord shows the authorization screen
            prompt: "consent",
          });

          const authUrl = `${baseUrl}?${params.toString()}`;
          console.log("Redirecting to:", authUrl);

          window.location.href = authUrl;
        })
        .catch((err) => {
          console.error("Error generating code challenge:", err);
          setError("Failed to start authentication");
          setIsConnecting(false);
        });
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login initialization failed");
      }
      setIsConnecting(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isConnected: !!user,
        isConnecting,
        error,
        login,
        logout,
        refreshRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useDiscordAuth() {
  return useContext(AuthContext);
}
