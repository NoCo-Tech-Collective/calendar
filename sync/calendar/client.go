package calendar

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"
)

const (
	googleCalendarAPIBase = "https://www.googleapis.com/calendar/v3"
)

// Client handles requests to the Google Calendar API
type Client struct {
	httpClient *http.Client
	apiKey     string
}

// NewClient creates a new Google Calendar API client
func NewClient(apiKey string) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		apiKey: apiKey,
	}
}

// EventDateTime represents a date/time in Google Calendar format
type EventDateTime struct {
	DateTime string `json:"dateTime,omitempty"`
	Date     string `json:"date,omitempty"`
	TimeZone string `json:"timeZone,omitempty"`
}

// Event represents a Google Calendar event
type Event struct {
	ID          string        `json:"id"`
	Summary     string        `json:"summary"`
	Description string        `json:"description"`
	Location    string        `json:"location"`
	Start       EventDateTime `json:"start"`
	End         EventDateTime `json:"end"`
	HTMLLink    string        `json:"htmlLink"`
	Status      string        `json:"status"`
}

// EventsResponse represents the response from the Google Calendar API
type EventsResponse struct {
	Items         []Event `json:"items"`
	NextPageToken string  `json:"nextPageToken"`
}

// GetEvents fetches events from a public calendar within a date range
func (c *Client) GetEvents(calendarID string, timeMin, timeMax time.Time) ([]Event, error) {
	var allEvents []Event
	pageToken := ""

	for {
		// Build URL
		apiURL := fmt.Sprintf("%s/calendars/%s/events", googleCalendarAPIBase, url.PathEscape(calendarID))

		req, err := http.NewRequest("GET", apiURL, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}

		// Set query parameters
		q := req.URL.Query()
		q.Add("timeMin", timeMin.Format(time.RFC3339))
		q.Add("timeMax", timeMax.Format(time.RFC3339))
		q.Add("singleEvents", "true")
		q.Add("orderBy", "startTime")

		if c.apiKey != "" {
			q.Add("key", c.apiKey)
		}

		if pageToken != "" {
			q.Add("pageToken", pageToken)
		}

		req.URL.RawQuery = q.Encode()

		// Log the full request URL
		log.Printf("Requesting: %s", req.URL.String())

		// Make request
		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch events: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
		}

		// Parse response
		var eventsResp EventsResponse
		if err := json.NewDecoder(resp.Body).Decode(&eventsResp); err != nil {
			return nil, fmt.Errorf("failed to decode response: %w", err)
		}

		allEvents = append(allEvents, eventsResp.Items...)

		pageToken = eventsResp.NextPageToken
		if pageToken == "" {
			break
		}
	}

	return allEvents, nil
}
