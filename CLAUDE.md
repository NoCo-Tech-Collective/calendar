# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a custom calendar application for the NoCo Tech Collective that displays recurring and static events. The calendar supports flexible event definitions with overrides and cancellations.

The project emphasizes fast load times, web accessibility (WCAG guidelines), and a responsive design with both light and dark modes. Theme preference respects the `prefers-color-scheme` CSS media query while also providing a manual theme toggle.

## Architecture

This is a client-side web application built with vanilla HTML5, CSS, and JavaScript:

### Core Files

- **index.html** - Main HTML structure with semantic markup and ARIA labels
- **styles.css** - Combined styles for layout and theming (derived from light.css and dark.css)
- **calendar.js** - Calendar rendering engine with event management
- **theme.js** - Light/dark mode toggle functionality
- **data/events.json** - Event data configuration file

### Event System

Events are defined in `data/events.json` with support for:

**Recurring Events:**
- **Weekly**: Use `daysOfWeek` with day numbers (0-6) or day names (`"monday"`, `"tue"`, etc.)
- **Monthly**: Multiple options:
  - `daysOfMonth: [3, 15]` - Specific days of the month
  - `ordinalDay: "third thursday"` - Nth occurrence of a weekday (supports `first`, `second`, `third`, `fourth`, `fifth`, `last`)
- **Daily**: Events that repeat every day

**Static Events:**
- One-time or multi-day events with explicit start and end dates

**Overrides:**
- Modify specific occurrences of recurring events
- Cancel individual instances
- Change time, location, or description for a specific date

## Key Features

- Responsive calendar grid with month navigation (buttons and arrow keys)
- Event details modal with keyboard support (ESC to close)
- Support for multiple events per day
- Visual distinction for today's date
- Event color coding
- Accessibility features (ARIA labels, semantic HTML, keyboard navigation)
