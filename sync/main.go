package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/NoCo-Tech-Collective/calendar/sync/calendar"
	"github.com/NoCo-Tech-Collective/calendar/sync/config"
	"github.com/NoCo-Tech-Collective/calendar/sync/merger"
)

func main() {
	// Configuration paths
	configPath := "../calendar-sources.json"
	eventsJSONPath := "../events.json"
	outputPath := "../events-materialized.json"

	// Allow overriding paths via environment variables
	if p := os.Getenv("CALENDAR_SOURCES"); p != "" {
		configPath = p
	}
	if p := os.Getenv("EVENTS_JSON"); p != "" {
		eventsJSONPath = p
	}
	if p := os.Getenv("OUTPUT_JSON"); p != "" {
		outputPath = p
	}

	log.Println("Starting calendar sync...")

	// Load configuration
	cfg, err := config.LoadConfig(configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	log.Printf("Loaded %d calendar source(s)", len(cfg.Sources))

	// Calculate time range (12 months past to 12 months future)
	now := time.Now()
	timeMin := time.Date(now.Year(), now.Month()-12, 1, 0, 0, 0, 0, time.UTC)
	timeMax := time.Date(now.Year(), now.Month()+13, 0, 23, 59, 59, 0, time.UTC)

	log.Printf("Fetching events from %s to %s", timeMin.Format("2006-01-02"), timeMax.Format("2006-01-02"))

	// Get API key from environment
	apiKey := os.Getenv("GOOGLE_CALENDAR_API_KEY")
	if apiKey == "" {
		log.Println("Warning: GOOGLE_CALENDAR_API_KEY not set. Public calendar access may be limited.")
	}

	// Create calendar client
	client := calendar.NewClient(apiKey)

	// Fetch and normalize events from all sources
	var allNormalizedEvents []*calendar.NormalizedEvent

	for _, source := range cfg.Sources {
		log.Printf("Fetching events from: %s (%s)", source.Name, source.CalendarID)

		events, err := calendar.FetchEvents(client, source, timeMin, timeMax)
		if err != nil {
			log.Printf("Error fetching events from %s: %v", source.Name, err)
			continue
		}

		log.Printf("Found %d event(s) from %s", len(events), source.Name)

		normalized, err := calendar.NormalizeEvents(events, source)
		if err != nil {
			log.Printf("Error normalizing events from %s: %v", source.Name, err)
			continue
		}

		log.Printf("Normalized %d event(s) from %s", len(normalized), source.Name)
		allNormalizedEvents = append(allNormalizedEvents, normalized...)
	}

	log.Printf("Total normalized events: %d", len(allNormalizedEvents))

	// Merge with existing events.json
	log.Printf("Merging with %s...", eventsJSONPath)
	if err := merger.MergeEvents(eventsJSONPath, allNormalizedEvents, outputPath); err != nil {
		log.Fatalf("Failed to merge events: %v", err)
	}

	log.Printf("Successfully created %s", outputPath)
	fmt.Println("✓ Calendar sync completed successfully!")
}
