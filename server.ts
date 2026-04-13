import "dotenv/config";
import express from "express";
import axios from "axios";
import cron from "node-cron";
import { checkTaskDeadlines, checkReminders } from "./src/services/taskNotificationService.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Schedule task deadline notifications (Run at 4 PM local time / 11 PM UTC)
  cron.schedule("0 23 * * *", async () => {
    console.log("[Cron] Running task deadline check...");
    await checkTaskDeadlines();
  });

  // Schedule task reminders (Run every minute)
  cron.schedule("* * * * *", async () => {
    console.log("[Cron] Running task reminder check...");
    await checkReminders();
  });

  // Manual trigger for task deadline check (for testing)
  app.post("/api/tasks/check-deadlines", async (req, res) => {
    try {
      await checkTaskDeadlines();
      res.json({ status: "ok", message: "Task deadline check triggered successfully" });
    } catch (error) {
      console.error("[API] Error triggering task deadline check:", error);
      res.status(500).json({ status: "error", message: "Failed to trigger task deadline check" });
    }
  });

  // Manual trigger for task reminder check (for testing)
  app.post("/api/tasks/check-reminders", async (req, res) => {
    try {
      await checkReminders();
      res.json({ status: "ok", message: "Task reminder check triggered successfully" });
    } catch (error) {
      console.error("[API] Error triggering task reminder check:", error);
      res.status(500).json({ status: "error", message: "Failed to trigger task reminder check" });
    }
  });

  // Proxy endpoint for Google Calendar ICS
  app.get("/api/calendar/proxy", async (req, res) => {
    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'vkis.business@gmail.com';
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
    const { createServer: createViteServer } = await import("vite");
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
