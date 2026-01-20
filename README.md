# NoCo Tech Calendar

A custom, lightweight calendar application for the Northern Colorado Tech Coalition. This calendar displays recurring and one-time events with support for flexible scheduling patterns, overrides, and cancellations.

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
  "color": "#9b59b6"
}
```

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
