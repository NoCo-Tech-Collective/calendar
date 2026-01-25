# NoCo Tech Calendar

As the Northern Colorado Tech community continues to grow, we've found a need for a unified calendar. Most people in the tech industry wear many hats, so a single group may not cover all the interests of an individual. "We" (including you, the reader) serve to provide a single point of reference for all of the tech groups in Colorado north of the Denver metro (we'll call this latitudes north of boulder county for now). 
## Contributing

To contribute events or improvements:

1. Fork the repository
2. Make your changes
3. Submit a pull request

For event submissions, please follow the JSON format examples below and ensure all required fields are included.

## Support

For questions, bug reporting or help creating events, please open an issue or email brandon@cyb3r.sh.

## Features

- **Flexible Event Scheduling**
  - Weekly events with day-of-week support (numeric or named days)
  - Monthly events with multiple patterns (specific days, "third Thursday", etc.)
  - Daily recurring events
  - One-time static events

- **Event Management**
  - Override specific occurrences of recurring events
  - Cancel individual instances
  - Modify time, location, or description for specific dates
  - Color-coded events

- **User Experience**
  - Responsive design that works on mobile and desktop
  - Light and dark mode with automatic detection and manual toggle
  - Keyboard navigation (arrow keys for months, ESC to close modals)
  - Accessible (WCAG compliant with ARIA labels and semantic HTML)
  - Fast loading with no external dependencies
  - Date range limited to 12 months in the past and 12 months in the future (rounded to full months) to optimize performance and relevance

## Quick Start

**Important**: Due to browser CORS security policies, you need to run a local web server to load `events.json`. Opening `index.html` directly from disk (`file://`) will fail to load events.

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
4. Edit `events.json` to add your own events and refresh the page

## Date Range Limitation

The calendar displays events within a **24-month window**: 12 months in the past and 12 months in the future, with both ranges rounded to include complete months.

**How it works:**
- If today is January 24, 2026, the calendar will show events from **January 1, 2025** through **January 31, 2027**
- Navigation buttons are automatically disabled when you reach the earliest or latest viewable month
- The event list view shows all events within this 24-month window, not just upcoming events
- This limitation optimizes performance and ensures the calendar focuses on relevant events

**Note:** Historical events older than 12 months and future events more than 12 months away will not be displayed, even if they are defined in `events.json`.

## Adding a New Community Group

To add a new tech community group to the calendar using `events.json` (as opposed to via a public google calendar):

1. **Add events to `events.json`** - Include all event details following the format examples below
2. **Update `about.html`** - Add your group to the "Community Groups" section with:
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

## Google Calendar Integration

The calendar can automatically sync events from public Google Calendars. This is useful for pulling in events from existing community calendars without manual data entry.

### Setup

1. **Get a Google Calendar API Key**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Calendar API
   - Create credentials (API Key)
   - Set the environment variable: `export GOOGLE_CALENDAR_API_KEY=your-api-key-here`

2. **Make your Google Calendar public** (or get access to a public calendar ID)

3. **Add calendar sources** to `calendar-sources.json` (alternatively email brandon@cyb3r.sh for help):

```json
{
  "sources": [
    {
      "name": "my-group",
      "contactEmail": "organizer@example.com",
      "calendarId": "your-calendar-id@group.calendar.google.com",
      "color": "#df7020",
      "website": "https://example.com",
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

### Sync Method

Events from public google calendars are synced every 5 minutes and then added to a materilized JSON file that is used to build the calendar on the client side. This means if you modify your google calendar, it should take at most 5 minutes to sync to nocotech.org. If it takes longer than this, open a github issue or email `brandon@cyb3r.sh`

#### Manual Sync (For developers)

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
- Combine them with manual events from `events.json`
- Generate `events-materialized.json`

The calendar automatically uses `events-materialized.json` if it exists, otherwise falls back to `events.json`.

### Event Filtering

- **includeKeywords**: Only include events containing these keywords (case-insensitive)
- **excludeKeywords**: Exclude events containing these keywords (case-insensitive)
- If `includeKeywords` is empty, all events are included (unless excluded)

### Finding Your Calendar ID

1. Go to your Google Calendar settings
2. Select the calendar you want to share
3. Scroll to "Integrate calendar"
4. Copy the "Calendar ID" (usually ends with `@group.calendar.google.com`)

### Automation

Consider setting up a cron job or GitHub Action to run the sync periodically:

```bash
# Run sync every day at 2am
0 2 * * * cd /path/to/calendar/sync && go run main.go
```

## Event Configuration

Events are defined in `events.json`. Here are examples of different event types:

### Weekly Recurring Event

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

### Monthly Recurring Event (Ordinal Day)

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

### Monthly Recurring Event (Specific Days)

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

### Static (One-time) Event

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

### Event Overrides

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

## Recurrence Options

### Weekly Events

- **daysOfWeek**: Array of days (numbers 0-6 or names)
  - Numbers: `0` = Sunday, `1` = Monday, ..., `6` = Saturday
  - Names: `"monday"`, `"tuesday"`, etc. (full or abbreviated like `"mon"`, `"tue"`)

### Monthly Events

Three options:

1. **daysOfMonth**: Array of specific day numbers `[3, 15]`
2. **ordinalDay**: String like `"third thursday"`, `"last friday"`, `"first monday"`
   - Ordinals: `first`, `second`, `third`, `fourth`, `fifth`, `last`
   - Days: Full or abbreviated day names

## File Structure

```
nocotech/
├── index.html           # Main HTML page
├── styles.css          # Styles for layout and themes
├── calendar.js         # Calendar rendering and event logic
├── theme.js            # Dark/light mode toggle
├── events.json         # Event data (edit this!)
├── events-example.json # Example event configurations
├── light.css           # Reference light theme
├── dark.css            # Reference dark theme
├── CLAUDE.md           # Developer guidance
└── README.md           # This file
```

## Customization

### Styling

Edit `styles.css` to customize colors, fonts, and layout. The calendar uses CSS custom properties for theming:

- `--bg-color`: Background color
- `--text-color`: Text color
- `--accent-color`: Accent/highlight color
- etc.

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
