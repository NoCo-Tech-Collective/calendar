/**
 * Custom calendar with support for recurring events, overrides, and static events
 */

(function() {
  'use strict';

  let currentDate = new Date();
  let eventsData = null;
  let currentView = 'calendar'; // 'calendar' or 'list'

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
      const response = await fetch('events.json');
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
    const eventStartDate = new Date(event.recurrence.startDate);
    const eventEndDate = event.recurrence.endDate ? new Date(event.recurrence.endDate) : null;

    // Check if date is within the event's date range
    if (date < eventStartDate) return false;
    if (eventEndDate && date > eventEndDate) return false;

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
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);
        shouldInclude = date >= startDate && date <= endDate;
      }

      if (shouldInclude) {
        events.push(eventData);
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

    // Show cancellation notice if applicable
    if (override && override.cancelled) {
      description.innerHTML = `<strong>CANCELLED</strong><br>${override.reason || 'This event has been cancelled'}`;
    }

    modal.classList.remove('hidden');
  }

  // Close event details modal
  function closeEventDetails() {
    document.getElementById('event-details').classList.add('hidden');
  }

  // Navigate to previous month
  function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  }

  // Navigate to next month
  function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  }

  // Render upcoming events list
  function renderEventList() {
    const eventList = document.getElementById('event-list');
    if (!eventList) return;

    eventList.innerHTML = '';

    // Get today's date and 12 months from now
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setFullYear(endDate.getFullYear() + 1); // 12 months from now

    // Collect all events with their dates
    const upcomingEvents = [];
    const currentDate = new Date(today);

    // Collect all events in the next 12 months
    while (currentDate <= endDate) {
      const events = getEventsForDate(currentDate);
      events.forEach(event => {
        const override = getOverride(event.id, formatDate(currentDate));
        // Skip cancelled events
        if (override && override.cancelled) return;

        upcomingEvents.push({
          event: event,
          date: new Date(currentDate),
          override: override
        });
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort by date
    upcomingEvents.sort((a, b) => a.date - b.date);

    // Render events
    if (upcomingEvents.length === 0) {
      eventList.innerHTML = '<p style="padding: 20px; text-align: center;">No upcoming events found in the next 12 months.</p>';
      return;
    }

    upcomingEvents.forEach(({ event, date, override }) => {
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

      eventItem.innerHTML = `
        <div class="event-date">${dateStr}</div>
        <div class="event-title">${event.title}</div>
        <div class="event-description">${event.description || 'No description available'}</div>
        <div class="event-meta">
          <span>⏰ ${timeStr}</span>
          <span>📍 ${event.location || 'TBD'}</span>
        </div>
      `;

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

    loadEvents();
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
