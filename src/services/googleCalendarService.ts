import ICAL from 'ical.js';
import axios from 'axios';

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}

const CALENDAR_ID = 'vkis.business@gmail.com';
const PROXY_URL = `/api/calendar/proxy`;

// Note: We're using a local server-side proxy to avoid CORS issues.
export async function fetchGoogleCalendarEvents(): Promise<GoogleCalendarEvent[]> {
  try {
    const response = await axios.get(PROXY_URL);
    const jcalData = ICAL.parse(response.data);
    const vcalendar = new ICAL.Component(jcalData);
    const vevents = vcalendar.getAllSubcomponents('vevent');

    return vevents
      .map((vevent) => {
        const event = new ICAL.Event(vevent);
        const status = vevent.getFirstPropertyValue('status');
        return {
          id: event.uid,
          title: event.summary,
          start: event.startDate.toJSDate(),
          end: event.endDate.toJSDate(),
          description: event.description,
          location: event.location,
          status: status,
        };
      })
      .filter((event) => event.status !== 'CANCELLED');
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    // Return empty array on error to prevent app crash
    return [];
  }
}
