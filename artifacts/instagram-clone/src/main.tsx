import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// When deployed standalone (e.g. Cloudflare Pages), the API is not co-located
// under the same origin, so point the generated client at the remote API.
// In Replit dev, VITE_API_URL is unset and requests stay relative ("/api/...")
// which the platform's path-based router proxies to the api-server artifact.
const remoteApiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (remoteApiUrl) {
  setBaseUrl(remoteApiUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
