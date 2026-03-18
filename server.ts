import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy endpoint for Google Calendar ICS
  app.get("/api/calendar/proxy", async (req, res) => {
    try {
      const calendarId = 'vkis.business@gmail.com';
      const icsUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
      
      console.log(`Fetching ICS from: ${icsUrl}`);
      
      const response = await axios.get(icsUrl, {
        responseType: 'text',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      res.setHeader('Content-Type', 'text/calendar');
      res.send(response.data);
    } catch (error: any) {
      console.error("Proxy error:", error.message);
      res.status(500).json({ error: "Failed to fetch calendar data", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
