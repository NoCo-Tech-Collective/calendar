# NoCo Tech Calendar

As the Northern Colorado Tech community continues to grow, we've found a need for a unified calendar. Most people in the tech industry wear many hats, so a single group may not cover all the interests of an individual. "We" (including you, the reader) serve to provide a single point of reference for all of the tech groups in Colorado north of the Denver metro (we'll call this latitudes north of boulder county for now). 

## Adding a New Community Group

There are three ways to get your events on the calendar:

1. **Submit the [Google Form](https://docs.google.com/forms/d/1p92GESkIgH2IVu4Pezj27llon-_bzBhjptVEFG7hc-g/viewform?edit_requested=true)** This is easiest option, we'll add your events for you. Since the maintainers have full time jobs, families, and hobbies this could take a few days.
2. **Add a Google Calendar source** — add an entry to `data/calendar-sources.json` for automated syncing from a public Google Calendar. See [Google Calendar Integration](#google-calendar-integration) below.
3. **Add events directly** — add recurring or static event entries to `data/events.json`. See [Event Configuration](#event-configuration) below.

For options 2 and 3, submit a pull request with your changes and update `about.html` with the following:
   - Group name (with website link if available)
   - Brief description of the group
   - Meeting schedule information

Example addition to `about.html`:
```html
<li>
  <strong><a href="https://example.com">Your Group Name</a></strong> -
  Brief description of your group. Meets [frequency] to [purpose].
</li>
```

## Date Range

The calendar displays events within a **24-month window**: 12 months in the past and 12 months in the future, with both ranges rounded to include complete months.

**How it works:**
- If today is January 24, 2026, the calendar will show events from **January 1, 2025** through **January 31, 2027**
- Navigation buttons are automatically disabled when you reach the earliest or latest viewable month
- The event list view shows all events within this 24-month window, not just upcoming events. However, past events are hidden by default.
- This limitation optimizes performance and ensures the calendar focuses on relevant events

**Note:** Historical events older than 12 months and future events more than 12 months away will not be displayed, even if they are defined in `data/events.json`.


## Developer Quick Start

**Important**: Due to browser CORS policies, you need to run a local web server to load `data/events.json`. Opening `index.html` directly from disk (`file://`) will fail to load events.

### Running Locally

1. Clone or download this repository
2. Start a local web server in the project directory:

   **Using Python 3:**
   ```bash
   python -m http.server 8000
   ```

   **Using Node.js (if you have npx):**
   ```bash
   npx http-server -p 8000
   ```

   **Using PHP:**
   ```bash
   php -S localhost:8000
   ```

3. Open your browser to `http://localhost:8000`

### Adding Events
For one-off or recurring events not backed by a google calendar, edit `data/events.json`. Alternatively google calendar sync can be configured by editing `data/calendar-sources.json`. 

In order to support both statically configured events and google calendar events, we combine `events.json` with google calendar events to create `events-materialized.json`. When this file exists, we serve it instead of `events.json`. To test the addition of a static event, it is probably ok to delete the materialized json and just ensure your new static event looks good. Full testing requires running the go binary to generate/update `events-materialized.json`. 

### Google Calendar Integration

The calendar can automatically sync events from public Google Calendars. This is useful for pulling in events from existing community calendars without manual data entry.

#### Setup

1. **Get a Google Calendar API Key**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Calendar API
   - Create credentials (API Key)
   - Set the environment variable: `export GOOGLE_CALENDAR_API_KEY=your-api-key-here`

2. **Make your Google Calendar public** (or get access to a public calendar ID)

3. **Add calendar sources** to `data/calendar-sources.json` (alternatively email brandon@cyb3r.sh for help):

```json
{
  "sources": [
    {
      "name": "my-group",
      "contactEmail": "organizer@example.com",
      "calendarId": "your-calendar-id@group.calendar.google.com",
      "color": "#df7020",
      "website": "https://example.com",
      "visible": true,
      "eventFilter": {
        "includeKeywords": [],
        "excludeKeywords": ["cancelled", "canceled"]
      }
    }
  ]
}
```

**Configuration Fields:**
- **name**: Unique identifier for this calendar source (lowercase, hyphens allowed)
- **contactEmail**: Email of the calendar maintainer
- **calendarId**: Google Calendar ID (found in calendar settings)
- **color**: Color code for events from this calendar (hex format)
- **website**: (Optional) Organization website to use for all events. If empty, individual event links to Google Calendar will be used
- **visible**: (Optional) Set to `false` to hide events by default. Hidden events can be viewed with `?showHidden=true` query parameter. Defaults to `true` if not specified. Useful for testing events before making them public.
- **eventFilter**: Keywords to include or exclude events

#### Manual Sync

**Run the sync binary** to fetch events and create `events-materialized.json`:

```bash
# Set your API key
export GOOGLE_CALENDAR_API_KEY=your-api-key-here

# Run the sync
cd sync
go run main.go
```

The sync tool will:
- Fetch events from all configured Google Calendars (within the 24-month window)
- Filter events based on your criteria
- Combine them with manual events from `data/events.json`
- Generate `data/events-materialized.json`

The calendar automatically uses `data/events-materialized.json` if it exists, otherwise falls back to `data/events.json`.

#### Event Filtering

- **includeKeywords**: Only include events containing these keywords (case-insensitive)
- **excludeKeywords**: Exclude events containing these keywords (case-insensitive)
- If `includeKeywords` is empty, all events are included (unless excluded)

#### Finding Your Calendar ID

1. Go to your Google Calendar settings
2. Select the calendar you want to share
3. Scroll to "Integrate calendar"
4. Copy the "Calendar ID" (usually ends with `@group.calendar.google.com`)

### Event Configuration

Events are defined in `data/events.json`. Here are examples of different event types:

#### Weekly Recurring Event

```json
{
  "id": "weekly-meetup",
  "title": "Weekly Meetup",
  "description": "Our weekly gathering",
  "type": "recurring",
  "recurrence": {
    "frequency": "weekly",
    "daysOfWeek": ["monday", "wednesday"],
    "startTime": "18:00",
    "endTime": "20:00",
    "startDate": "2024-01-01",
    "endDate": null
  },
  "location": "TBD",
  "website": "https://example.com",
  "color": "#3498db"
}
```

#### Monthly Recurring Event (Ordinal Day)

```json
{
  "id": "monthly-social",
  "title": "Monthly Social",
  "description": "First Friday social hour",
  "type": "recurring",
  "recurrence": {
    "frequency": "monthly",
    "ordinalDay": "first friday",
    "startTime": "17:00",
    "endTime": "19:00",
    "startDate": "2024-01-01",
    "endDate": null
  },
  "location": "Local Bar",
  "website": "https://example.com",
  "color": "#e74c3c"
}
```

#### Monthly Recurring Event (Specific Days)

```json
{
  "id": "monthly-meeting",
  "title": "Monthly Meeting",
  "description": "Meeting on the 3rd and 15th",
  "type": "recurring",
  "recurrence": {
    "frequency": "monthly",
    "daysOfMonth": [3, 15],
    "startTime": "19:00",
    "endTime": "21:00",
    "startDate": "2024-01-01",
    "endDate": null
  },
  "location": "Community Center",
  "website": "https://example.com",
  "color": "#2ecc71"
}
```

#### Static (One-time) Event

```json
{
  "id": "special-conference",
  "title": "Tech Conference",
  "description": "Annual tech conference",
  "type": "static",
  "startDate": "2024-06-15",
  "endDate": "2024-06-17",
  "startTime": "09:00",
  "endTime": "17:00",
  "location": "Convention Center",
  "website": "https://example.com",
  "color": "#9b59b6"
}
```

**Note:** The `website` field is optional. If omitted, no website link will be displayed.

#### Event Overrides

Cancel or modify specific occurrences:

```json
{
  "overrides": [
    {
      "eventId": "weekly-meetup",
      "date": "2024-12-25",
      "cancelled": true,
      "reason": "Holiday - No meeting"
    },
    {
      "eventId": "monthly-social",
      "date": "2024-07-05",
      "location": "Park Pavilion",
      "description": "Special outdoor edition!"
    }
  ]
}
```

### Recurrence Options

#### Weekly Events

- **daysOfWeek**: Array of days (numbers 0-6 or names)
  - Numbers: `0` = Sunday, `1` = Monday, ..., `6` = Saturday
  - Names: `"monday"`, `"tuesday"`, etc. (full or abbreviated like `"mon"`, `"tue"`)

#### Monthly Events

Three options:

1. **daysOfMonth**: Array of specific day numbers `[3, 15]`
2. **ordinalDay**: String like `"third thursday"`, `"last friday"`, `"first monday"`
   - Ordinals: `first`, `second`, `third`, `fourth`, `fifth`, `last`
   - Days: Full or abbreviated day names

### Event Colors

Each event can have a custom `color` property. Use any valid CSS color:

```json
"color": "#ff6b6b"     // Hex
"color": "rgb(255, 107, 107)"  // RGB
"color": "hsl(0, 100%, 71%)"   // HSL
```

## License

This project is open source under the GPLv3 license.

## Attribution

- Favicon is from https://www.favicon.cc/?action=icon&file_id=68311
- Theme is based on https://panr.github.io/terminal-css/
