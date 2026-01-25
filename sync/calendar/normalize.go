package calendar

import (
	"fmt"
	"strings"
	"time"

	"github.com/NoCo-Tech-Collective/calendar/sync/config"
)

// NormalizedEvent represents an event in our calendar format
type NormalizedEvent struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Type        string `json:"type"`
	StartDate   string `json:"startDate"`
	EndDate     string `json:"endDate"`
	StartTime   string `json:"startTime"`
	EndTime     string `json:"endTime"`
	Location    string `json:"location"`
	Website     string `json:"website"`
	GcalLink    string `json:"gcalLink,omitempty"`
	Visible     bool   `json:"visible"`
	Color       string `json:"color"`
}

// NormalizeEvent converts a Google Calendar event to our format
func NormalizeEvent(event Event, source config.Source) (*NormalizedEvent, error) {
	// Generate a unique ID combining source name and event ID
	normalizedID := fmt.Sprintf("%s-%s", source.Name, event.ID)

	// Parse start and end times
	startDate, startTime, err := parseEventDateTime(event.Start)
	if err != nil {
		return nil, fmt.Errorf("failed to parse start time: %w", err)
	}

	endDate, endTime, err := parseEventDateTime(event.End)
	if err != nil {
		return nil, fmt.Errorf("failed to parse end time: %w", err)
	}

	// Determine visibility (default to true if not specified)
	visible := true
	if source.Visible != nil {
		visible = *source.Visible
	}

	// Create normalized event
	normalized := &NormalizedEvent{
		ID:          normalizedID,
		Title:       event.Summary,
		Description: event.Description,
		Type:        "static",
		StartDate:   startDate,
		EndDate:     endDate,
		StartTime:   startTime,
		EndTime:     endTime,
		Location:    event.Location,
		Website:     source.Website,
		GcalLink:    event.HTMLLink, // Always preserve the Google Calendar link
		Visible:     visible,
		Color:       source.Color,
	}

	return normalized, nil
}

// parseEventDateTime parses Google Calendar EventDateTime into date and time strings
func parseEventDateTime(edt EventDateTime) (date, timeStr string, err error) {
	// All-day events use the Date field
	if edt.Date != "" {
		// Date is in YYYY-MM-DD format
		date = edt.Date
		timeStr = "00:00"
		return date, timeStr, nil
	}

	// Timed events use the DateTime field
	if edt.DateTime != "" {
		t, err := time.Parse(time.RFC3339, edt.DateTime)
		if err != nil {
			return "", "", fmt.Errorf("failed to parse datetime: %w", err)
		}

		// Format as YYYY-MM-DD
		date = t.Format("2006-01-02")

		// Format time as HH:MM
		timeStr = t.Format("15:04")

		return date, timeStr, nil
	}

	return "", "", fmt.Errorf("event has no date or datetime")
}

// NormalizeEvents converts multiple Google Calendar events to our format
func NormalizeEvents(events []Event, source config.Source) ([]*NormalizedEvent, error) {
	normalized := make([]*NormalizedEvent, 0, len(events))

	for _, event := range events {
		ne, err := NormalizeEvent(event, source)
		if err != nil {
			// Log error but continue processing other events
			fmt.Printf("Warning: failed to normalize event %s: %v\n", event.ID, err)
			continue
		}
		normalized = append(normalized, ne)
	}

	return normalized, nil
}

// SanitizeSourceName converts a source name to a valid ID component
func SanitizeSourceName(name string) string {
	// Convert to lowercase and replace spaces with hyphens
	sanitized := strings.ToLower(name)
	sanitized = strings.ReplaceAll(sanitized, " ", "-")
	// Remove any characters that aren't alphanumeric or hyphens
	result := ""
	for _, r := range sanitized {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result += string(r)
		}
	}
	return result
}
