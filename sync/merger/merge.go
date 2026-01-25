package merger

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/NoCo-Tech-Collective/calendar/sync/calendar"
)

// EventsFile represents the structure of events.json and events-materialized.json
type EventsFile struct {
	Events    []json.RawMessage `json:"events"`
	Overrides []json.RawMessage `json:"overrides"`
}

// MergeEvents combines events from events.json with normalized Google Calendar events
func MergeEvents(eventsJSONPath string, normalizedEvents []*calendar.NormalizedEvent, outputPath string) error {
	// Load existing events.json
	baseEvents, err := loadEventsFile(eventsJSONPath)
	if err != nil {
		return fmt.Errorf("failed to load base events: %w", err)
	}

	// Convert normalized events to JSON
	for _, ne := range normalizedEvents {
		eventJSON, err := json.Marshal(ne)
		if err != nil {
			return fmt.Errorf("failed to marshal normalized event: %w", err)
		}
		baseEvents.Events = append(baseEvents.Events, eventJSON)
	}

	// Write merged events to output file
	if err := writeEventsFile(outputPath, baseEvents); err != nil {
		return fmt.Errorf("failed to write merged events: %w", err)
	}

	return nil
}

// loadEventsFile loads an events JSON file
func loadEventsFile(path string) (*EventsFile, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var eventsFile EventsFile
	if err := json.Unmarshal(data, &eventsFile); err != nil {
		return nil, err
	}

	return &eventsFile, nil
}

// writeEventsFile writes an events JSON file with pretty formatting using atomic replacement
func writeEventsFile(path string, eventsFile *EventsFile) error {
	// Marshal to JSON in memory first
	data, err := json.MarshalIndent(eventsFile, "", "  ")
	if err != nil {
		return err
	}

	// Write to a temporary file in the same directory
	dir := filepath.Dir(path)
	tempFile, err := os.CreateTemp(dir, ".events-materialized-*.json.tmp")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	tempPath := tempFile.Name()

	// Clean up temp file if we fail
	defer func() {
		if tempFile != nil {
			tempFile.Close()
			os.Remove(tempPath)
		}
	}()

	// Write data to temp file
	if _, err := tempFile.Write(data); err != nil {
		return fmt.Errorf("failed to write to temp file: %w", err)
	}

	// Sync to disk to ensure data is written
	if err := tempFile.Sync(); err != nil {
		return fmt.Errorf("failed to sync temp file: %w", err)
	}

	// Close temp file before rename
	if err := tempFile.Close(); err != nil {
		return fmt.Errorf("failed to close temp file: %w", err)
	}
	tempFile = nil // Prevent cleanup in defer

	// Atomically replace the target file
	if err := os.Rename(tempPath, path); err != nil {
		return fmt.Errorf("failed to rename temp file: %w", err)
	}

	return nil
}
