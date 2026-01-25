package calendar

import (
	"fmt"
	"strings"
	"time"

	"github.com/NoCo-Tech-Collective/calendar/sync/config"
)

// FetchEvents fetches and filters events from a calendar source
func FetchEvents(client *Client, source config.Source, timeMin, timeMax time.Time) ([]Event, error) {
	// Fetch all events from the calendar
	events, err := client.GetEvents(source.CalendarID, timeMin, timeMax)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch events for %s: %w", source.Name, err)
	}

	// Apply filters
	filtered := make([]Event, 0)
	for _, event := range events {
		// Skip cancelled events
		if event.Status == "cancelled" {
			continue
		}

		// Apply keyword filters
		if shouldIncludeEvent(event, source.EventFilter) {
			filtered = append(filtered, event)
		}
	}

	return filtered, nil
}

// shouldIncludeEvent checks if an event matches the filter criteria
func shouldIncludeEvent(event Event, filter config.EventFilter) bool {
	eventText := strings.ToLower(event.Summary + " " + event.Description)

	// Check exclude keywords first
	for _, keyword := range filter.ExcludeKeywords {
		if keyword != "" && strings.Contains(eventText, strings.ToLower(keyword)) {
			return false
		}
	}

	// If no include keywords specified, include all (that didn't match exclude)
	if len(filter.IncludeKeywords) == 0 {
		return true
	}

	// Check include keywords
	for _, keyword := range filter.IncludeKeywords {
		if keyword != "" && strings.Contains(eventText, strings.ToLower(keyword)) {
			return true
		}
	}

	// If include keywords specified but none matched, exclude the event
	return false
}
