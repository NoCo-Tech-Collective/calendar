package config

import (
	"encoding/json"
	"os"
)

// EventFilter defines filtering criteria for events
type EventFilter struct {
	IncludeKeywords []string `json:"includeKeywords"`
	ExcludeKeywords []string `json:"excludeKeywords"`
}

// Source represents a single calendar source
type Source struct {
	Name         string      `json:"name"`
	ContactEmail string      `json:"contactEmail"`
	CalendarID   string      `json:"calendarId"`
	Color        string      `json:"color"`
	Website      string      `json:"website"`
	Visible      *bool       `json:"visible,omitempty"` // nil = true (default), explicit false = hidden
	EventFilter  EventFilter `json:"eventFilter"`
}

// Config represents the calendar sources configuration
type Config struct {
	Sources []Source `json:"sources"`
}

// LoadConfig loads the calendar sources configuration from a JSON file
func LoadConfig(filename string) (*Config, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return &config, nil
}
