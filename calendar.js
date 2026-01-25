/**
 * Custom calendar with support for recurring events, overrides, and static events
 */

(function() {
  'use strict';

  let currentDate = new Date();
  let eventsData = null;
  let currentView = 'calendar'; // 'calendar' or 'list'
  let showPastEvents = false; // Whether to show past events in list view
  let showHidden = false; // Whether to show hidden events (from ?showHidden=true query param)

  // Calculate min and max allowed dates (12 months in each direction, rounded to full months)
  function getMinAllowedDate() {
    const now = new Date();
    const minDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    minDate.setHours(0, 0, 0, 0);
    return minDate;
  }

  function getMaxAllowedDate() {
    const now = new Date();
    const maxDate = new Date(now.getFullYear(), now.getMonth() + 13, 0); // Last day of month 12 months from now
    maxDate.setHours(23, 59, 59, 999);
    return maxDate;
  }

  // Check if a date is within the allowed range
  function isWithinAllowedRange(date) {
    const minDate = getMinAllowedDate();
    const maxDate = getMaxAllowedDate();
    return date >= minDate && date <= maxDate;
  }

  // Get query parameter from URL
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  // Update query parameter in URL without reloading
  function updateQueryParam(param, value) {
    const url = new URL(window.location);
    if (value) {
      url.searchParams.set(param, value);
    } else {
      url.searchParams.delete(param);
    }
    window.history.pushState({}, '', url);
  }

  // Load events from JSON file
  async function loadEvents() {
    try {
      // Try to load events-materialized.json first (includes Google Calendar events)
      let response = await fetch('events-materialized.json');

      // If materialized file doesn't exist, fall back to events.json
      if (!response.ok) {
        response = await fetch('events.json');
      }

      eventsData = await response.json();
      renderCalendar();
      renderEventList();
    } catch (error) {
      console.error('Failed to load events:', error);
      document.getElementById('current-month').textContent = 'Error loading events';
    }
  }

  // Format date as YYYY-MM-DD
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Convert day name to day number (0 = Sunday, 6 = Saturday)
  function dayNameToNumber(dayName) {
    const days = {
      'sunday': 0, 'sun': 0,
      'monday': 1, 'mon': 1,
      'tuesday': 2, 'tue': 2, 'tues': 2,
      'wednesday': 3, 'wed': 3,
      'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
      'friday': 5, 'fri': 5,
      'saturday': 6, 'sat': 6
    };
    return days[dayName.toLowerCase()];
  }

  // Normalize daysOfWeek to always be an array of numbers
  function normalizeDaysOfWeek(daysOfWeek) {
    if (!daysOfWeek) return [];
    return daysOfWeek.map(day => {
      if (typeof day === 'string') {
        return dayNameToNumber(day);
      }
      return day;
    });
  }

  // Parse ordinal string like "third thursday" into {ordinal: 3, dayOfWeek: 4}
  function parseOrdinalDay(ordinalStr) {
    const ordinals = {
      'first': 1, '1st': 1,
      'second': 2, '2nd': 2,
      'third': 3, '3rd': 3,
      'fourth': 4, '4th': 4,
      'fifth': 5, '5th': 5,
      'last': -1
    };

    const parts = ordinalStr.toLowerCase().trim().split(/\s+/);
    if (parts.length !== 2) return null;

    const ordinal = ordinals[parts[0]];
    const dayOfWeek = dayNameToNumber(parts[1]);

    if (ordinal === undefined || dayOfWeek === undefined) return null;

    return { ordinal, dayOfWeek };
  }

  // Get the Nth occurrence of a day in a month
  function getNthDayOfMonth(year, month, dayOfWeek, n) {
    if (n === -1) {
      // Last occurrence
      const lastDay = new Date(year, month + 1, 0);
      const lastDayOfWeek = lastDay.getDay();
      const diff = (lastDayOfWeek - dayOfWeek + 7) % 7;
      return lastDay.getDate() - diff;
    } else {
      // Nth occurrence (1-5)
      const firstDay = new Date(year, month, 1);
      const firstDayOfWeek = firstDay.getDay();
      const diff = (dayOfWeek - firstDayOfWeek + 7) % 7;
      return 1 + diff + (n - 1) * 7;
    }
  }

  // Check if a date matches a recurring event
  function isRecurringEventOnDate(event, date) {
    const dateStr = formatDate(date);

    // Normalize dates for comparison (remove time component)
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startParts = event.recurrence.startDate.split('-');
    const eventStartDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));

    let eventEndDate = null;
    if (event.recurrence.endDate) {
      const endParts = event.recurrence.endDate.split('-');
      eventEndDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
    }

    // Check if date is within the event's date range
    if (checkDate < eventStartDate) return false;
    if (eventEndDate && checkDate > eventEndDate) return false;

    // Check frequency
    if (event.recurrence.frequency === 'weekly') {
      const dayOfWeek = date.getDay();
      const normalizedDays = normalizeDaysOfWeek(event.recurrence.daysOfWeek);
      return normalizedDays.includes(dayOfWeek);
    } else if (event.recurrence.frequency === 'monthly') {
      // Support multiple formats:
      // 1. daysOfMonth: [3, 15] - specific days
      // 2. ordinalDay: "third thursday" - Nth occurrence of a weekday
      // 3. daysOfWeek with ordinal - deprecated, use ordinalDay instead

      if (event.recurrence.daysOfMonth) {
        return event.recurrence.daysOfMonth.includes(date.getDate());
      } else if (event.recurrence.ordinalDay) {
        const parsed = parseOrdinalDay(event.recurrence.ordinalDay);
        if (parsed) {
          const nthDay = getNthDayOfMonth(date.getFullYear(), date.getMonth(), parsed.dayOfWeek, parsed.ordinal);
          return date.getDate() === nthDay;
        }
      } else if (event.recurrence.dayOfMonth !== undefined) {
        // Legacy support for single dayOfMonth
        return date.getDate() === event.recurrence.dayOfMonth;
      }
    } else if (event.recurrence.frequency === 'daily') {
      return true;
    }

    return false;
  }

  // Get override for a specific event and date
  function getOverride(eventId, dateStr) {
    if (!eventsData || !eventsData.overrides) return null;
    return eventsData.overrides.find(
      override => override.eventId === eventId && override.date === dateStr
    );
  }

  // Get all events for a specific date
  function getEventsForDate(date) {
    if (!eventsData) return [];

    const dateStr = formatDate(date);
    const events = [];

    eventsData.events.forEach(event => {
      let shouldInclude = false;
      let eventData = { ...event };

      if (event.type === 'recurring') {
        shouldInclude = isRecurringEventOnDate(event, date);

        // Check for override
        const override = getOverride(event.id, dateStr);
        if (override) {
          if (override.cancelled) {
            shouldInclude = false;
          } else {
            // Apply override properties
            eventData = {
              ...eventData,
              title: override.title || eventData.title,
              description: override.description || eventData.description,
              location: override.location || eventData.location,
              recurrence: {
                ...eventData.recurrence,
                startTime: override.startTime || eventData.recurrence.startTime,
                endTime: override.endTime || eventData.recurrence.endTime
              },
              isOverridden: true
            };
          }
        }
      } else if (event.type === 'static') {
        // Normalize dates for comparison
        const startParts = event.startDate.split('-');
        const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
        const endParts = event.endDate.split('-');
        const endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
        const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        // Check if this is a full-day event (starts and ends at 00:00)
        const isFullDayEvent = event.startTime === '00:00' && event.endTime === '00:00';

        // For full-day events, exclude the end date (show only on start date)
        // For timed events, include both start and end dates
        if (isFullDayEvent) {
          shouldInclude = checkDate >= startDate && checkDate < endDate;
        } else {
          shouldInclude = checkDate >= startDate && checkDate <= endDate;
        }
      }

      // Check visibility (default to true for backward compatibility)
      const isVisible = event.visible !== false;

      if (shouldInclude) {
        // Only include event if it's visible OR if showHidden is enabled
        if (isVisible || showHidden) {
          events.push(eventData);
        }
      }
    });

    return events;
  }

  // Render the calendar for the current month
  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update month display
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    document.getElementById('current-month').textContent = `${monthNames[month]} ${year}`;

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const numDays = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Get previous month's last days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();

    const calendarDays = document.getElementById('calendar-days');
    calendarDays.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add previous month's trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(year, month - 1, day);
      const dayEl = createDayElement(day, date, true);
      calendarDays.appendChild(dayEl);
    }

    // Add current month's days
    for (let day = 1; day <= numDays; day++) {
      const date = new Date(year, month, day);
      const isToday = date.getTime() === today.getTime();
      const dayEl = createDayElement(day, date, false, isToday);
      calendarDays.appendChild(dayEl);
    }

    // Add next month's leading days
    const totalCells = calendarDays.children.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      const dayEl = createDayElement(day, date, true);
      calendarDays.appendChild(dayEl);
    }

    // Update navigation button states
    updateNavigationButtons();
  }

  // Create a day element with events
  function createDayElement(day, date, isOtherMonth, isToday = false) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    if (isOtherMonth) dayEl.classList.add('other-month');
    if (isToday) dayEl.classList.add('today');

    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayEl.appendChild(dayNumber);

    // Add events for this day
    const events = getEventsForDate(date);
    events.forEach(event => {
      const eventEl = document.createElement('div');
      eventEl.className = 'event';

      // Check if this specific occurrence is cancelled
      const override = getOverride(event.id, formatDate(date));
      if (override && override.cancelled) {
        eventEl.classList.add('cancelled');
      }

      eventEl.textContent = event.title;
      eventEl.style.borderLeftColor = event.color || '#df7020';

      eventEl.addEventListener('click', (e) => {
        e.stopPropagation();
        showEventDetails(event, date, override);
      });

      dayEl.appendChild(eventEl);
    });

    return dayEl;
  }

  // Show event details modal
  function showEventDetails(event, date, override) {
    const modal = document.getElementById('event-details');
    const title = document.getElementById('detail-title');
    const description = document.getElementById('detail-description');
    const time = document.getElementById('detail-time');
    const location = document.getElementById('detail-location');
    const website = document.getElementById('detail-website');
    const addToCalendarBtn = document.getElementById('add-to-calendar');

    title.textContent = event.title;
    description.textContent = event.description || 'No description available';

    // Format time
    let timeStr = '';
    if (event.type === 'recurring') {
      timeStr = `${event.recurrence.startTime} - ${event.recurrence.endTime}`;
    } else if (event.type === 'static') {
      timeStr = `${event.startTime} - ${event.endTime}`;
      if (event.startDate !== event.endDate) {
        timeStr += ` (${event.startDate} to ${event.endDate})`;
      }
    }
    time.textContent = `Time: ${timeStr}`;

    location.textContent = `Location: ${event.location || 'TBD'}`;

    // Show website if available and not empty
    if (event.website && event.website.trim() !== '') {
      website.innerHTML = `Website: <a href="${event.website}" target="_blank" rel="noopener noreferrer">${event.website}</a>`;
      website.style.display = 'block';
    } else {
      website.style.display = 'none';
    }

    // Show cancellation notice if applicable
    if (override && override.cancelled) {
      description.innerHTML = `<strong>CANCELLED</strong><br>${override.reason || 'This event has been cancelled'}`;
    }

    // Setup calendar button
    if (event.gcalLink) {
      // For Google Calendar events, link to GCal instead of generating ICS
      addToCalendarBtn.textContent = '📅 View in Google Calendar';
      addToCalendarBtn.onclick = (e) => {
        e.stopPropagation();
        window.open(event.gcalLink, '_blank', 'noopener,noreferrer');
      };
    } else {
      // For manual events, download ICS file
      addToCalendarBtn.textContent = '📅 Add to Calendar';
      addToCalendarBtn.onclick = (e) => {
        e.stopPropagation();
        downloadICS(event, date);
      };
    }

    modal.classList.remove('hidden');
  }

  // Close event details modal
  function closeEventDetails() {
    document.getElementById('event-details').classList.add('hidden');
  }

  // Generate iCalendar (.ics) file for an event
  function generateICS(event, date) {
    // Format date as YYYYMMDD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Get start and end times
    let startTime = '';
    let endTime = '';
    if (event.type === 'recurring') {
      startTime = event.recurrence.startTime.replace(':', '') + '00';
      endTime = event.recurrence.endTime.replace(':', '') + '00';
    } else if (event.type === 'static') {
      startTime = event.startTime.replace(':', '') + '00';
      endTime = event.endTime.replace(':', '') + '00';
    }

    // Create timestamp for when the event was created
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Build iCalendar content with timezone information
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NoCo Tech Collective//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE',
      'TZID:America/Denver',
      'BEGIN:DAYLIGHT',
      'TZOFFSETFROM:-0700',
      'TZOFFSETTO:-0600',
      'TZNAME:MDT',
      'DTSTART:19700308T020000',
      'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
      'END:DAYLIGHT',
      'BEGIN:STANDARD',
      'TZOFFSETFROM:-0600',
      'TZOFFSETTO:-0700',
      'TZNAME:MST',
      'DTSTART:19701101T020000',
      'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
      'END:STANDARD',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      `UID:${event.id}-${dateStr}@nocotech.org`,
      `DTSTAMP:${timestamp}`,
      `DTSTART;TZID=America/Denver:${dateStr}T${startTime}`,
      `DTEND;TZID=America/Denver:${dateStr}T${endTime}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${event.location || ''}`,
      event.website ? `URL:${event.website}` : '',
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(line => line).join('\r\n');

    return icsContent;
  }

  // Download .ics file
  function downloadICS(event, date) {
    const icsContent = generateICS(event, date);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.id}-${formatDate(date)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Navigate to previous month
  function prevMonth() {
    const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const minDate = getMinAllowedDate();

    // Only navigate if the previous month is within the allowed range
    if (prevMonthDate >= minDate) {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    }
  }

  // Navigate to next month
  function nextMonth() {
    const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const maxDate = getMaxAllowedDate();

    // Only navigate if the next month is within the allowed range
    if (nextMonthDate <= maxDate) {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    }
  }

  // Update navigation button states based on current month
  function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-month');
    const nextButton = document.getElementById('next-month');
    const minDate = getMinAllowedDate();
    const maxDate = getMaxAllowedDate();

    const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

    // Disable previous button if we're at the minimum month
    if (prevMonthDate < minDate) {
      prevButton.disabled = true;
      prevButton.style.opacity = '0.5';
      prevButton.style.cursor = 'not-allowed';
    } else {
      prevButton.disabled = false;
      prevButton.style.opacity = '1';
      prevButton.style.cursor = 'pointer';
    }

    // Disable next button if we're at the maximum month
    if (nextMonthDate > maxDate) {
      nextButton.disabled = true;
      nextButton.style.opacity = '0.5';
      nextButton.style.cursor = 'not-allowed';
    } else {
      nextButton.disabled = false;
      nextButton.style.opacity = '1';
      nextButton.style.cursor = 'pointer';
    }
  }

  // Render upcoming events list
  function renderEventList() {
    const eventList = document.getElementById('event-list');
    if (!eventList) return;

    eventList.innerHTML = '';

    // Use the allowed date range (past 12 months to future 12 months)
    const minDate = getMinAllowedDate();
    const maxDate = getMaxAllowedDate();

    // Collect all events with their dates
    const upcomingEvents = [];
    const currentDate = new Date(minDate);

    // Collect all events within the allowed date range
    while (currentDate <= maxDate) {
      const events = getEventsForDate(currentDate);
      events.forEach(event => {
        const override = getOverride(event.id, formatDate(currentDate));
        // Skip cancelled events
        if (override && override.cancelled) return;

        // Check if we already have this event (to avoid duplicates from multi-day events)
        const alreadyAdded = upcomingEvents.find(
          item => item.event.id === event.id && formatDate(item.date) === formatDate(currentDate)
        );

        if (!alreadyAdded) {
          upcomingEvents.push({
            event: event,
            date: new Date(currentDate),
            override: override
          });
        }
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort by date
    upcomingEvents.sort((a, b) => a.date - b.date);

    // Split events into past and future
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastEvents = upcomingEvents.filter(({ date }) => date < today);
    const futureEvents = upcomingEvents.filter(({ date }) => date >= today);

    // Determine which events to show
    const eventsToShow = showPastEvents ? upcomingEvents : futureEvents;

    // Render events
    if (eventsToShow.length === 0) {
      eventList.innerHTML = '<p style="padding: 20px; text-align: center;">No upcoming events found.</p>';
      return;
    }

    // Add "Show Past Events" button if there are past events and they're not shown
    if (pastEvents.length > 0 && !showPastEvents) {
      const showPastBtn = document.createElement('button');
      showPastBtn.className = 'show-past-events-btn';
      showPastBtn.textContent = `📅 Show ${pastEvents.length} Past Event${pastEvents.length !== 1 ? 's' : ''}`;
      showPastBtn.addEventListener('click', () => {
        showPastEvents = true;
        renderEventList();
      });
      eventList.appendChild(showPastBtn);
    }

    // Add "Hide Past Events" button if past events are shown
    if (showPastEvents && pastEvents.length > 0) {
      const hidePastBtn = document.createElement('button');
      hidePastBtn.className = 'show-past-events-btn';
      hidePastBtn.textContent = '📅 Hide Past Events';
      hidePastBtn.addEventListener('click', () => {
        showPastEvents = false;
        renderEventList();
      });
      eventList.appendChild(hidePastBtn);
    }

    eventsToShow.forEach(({ event, date, override }) => {
      const eventItem = document.createElement('div');
      eventItem.className = 'event-list-item';
      if (override && override.cancelled) {
        eventItem.classList.add('cancelled');
      }

      // Format date
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const dateStr = `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

      // Format time
      let timeStr = '';
      if (event.type === 'recurring') {
        timeStr = `${event.recurrence.startTime} - ${event.recurrence.endTime}`;
      } else if (event.type === 'static') {
        timeStr = `${event.startTime} - ${event.endTime}`;
      }

      // Build website link if available and not empty
      const websiteHtml = (event.website && event.website.trim() !== '')
        ? `<span>🔗 <a href="${event.website}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Website</a></span>`
        : '';

      // Determine button text based on event source
      const buttonText = event.gcalLink ? '📅 View in Google Calendar' : '📅 Add to Calendar';

      eventItem.innerHTML = `
        <div class="event-date">${dateStr}</div>
        <div class="event-title">${event.title}</div>
        <div class="event-description">${event.description || 'No description available'}</div>
        <div class="event-meta">
          <span>⏰ ${timeStr}</span>
          <span>📍 ${event.location || 'TBD'}</span>
          ${websiteHtml}
        </div>
        <button class="add-to-calendar-btn-inline" data-event-index="${upcomingEvents.indexOf({ event, date, override })}">
          ${buttonText}
        </button>
      `;

      // Add click handler to the button
      const calendarBtn = eventItem.querySelector('.add-to-calendar-btn-inline');
      calendarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (event.gcalLink) {
          window.open(event.gcalLink, '_blank', 'noopener,noreferrer');
        } else {
          downloadICS(event, date);
        }
      });

      eventItem.addEventListener('click', () => {
        showEventDetails(event, date, override);
      });

      eventList.appendChild(eventItem);
    });
  }

  // Set the view (calendar or list)
  function setView(view) {
    const calendarView = document.getElementById('calendar-view');
    const listView = document.getElementById('list-view');

    currentView = view;

    if (view === 'list') {
      calendarView.classList.add('hidden');
      listView.classList.remove('hidden');
      updateQueryParam('view', 'list');
    } else {
      calendarView.classList.remove('hidden');
      listView.classList.add('hidden');
      updateQueryParam('view', 'calendar');
    }
  }

  // Toggle between calendar and list view
  function toggleView() {
    if (currentView === 'calendar') {
      setView('list');
    } else {
      setView('calendar');
    }
  }

  // Initialize calendar
  function init() {
    document.getElementById('prev-month').addEventListener('click', prevMonth);
    document.getElementById('next-month').addEventListener('click', nextMonth);
    document.getElementById('close-details').addEventListener('click', closeEventDetails);
    document.getElementById('view-toggle').addEventListener('click', toggleView);
    document.getElementById('view-toggle-list').addEventListener('click', toggleView);

    // Close modal when clicking outside
    document.getElementById('event-details').addEventListener('click', (e) => {
      if (e.target.id === 'event-details') {
        closeEventDetails();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeEventDetails();
      } else if (e.key === 'ArrowLeft') {
        prevMonth();
      } else if (e.key === 'ArrowRight') {
        nextMonth();
      }
    });

    // Check for view query parameter
    const viewParam = getQueryParam('view');
    if (viewParam === 'list') {
      setView('list');
    } else {
      setView('calendar');
    }

    // Check for showHidden query parameter
    const showHiddenParam = getQueryParam('showHidden');
    if (showHiddenParam === 'true') {
      showHidden = true;
    }

    loadEvents();
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
