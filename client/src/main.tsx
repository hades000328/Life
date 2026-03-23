import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function loadAnalytics() {
	const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim();
	const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID?.trim();

	if (!endpoint || !websiteId) {
		return;
	}

	const normalizedEndpoint = endpoint.endsWith("/") ? endpoint : `${endpoint}/`;
	const script = document.createElement("script");
	script.defer = true;
	script.src = new URL("umami", normalizedEndpoint).toString();
	script.dataset.websiteId = websiteId;
	document.head.appendChild(script);
}

loadAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
