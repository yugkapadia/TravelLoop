const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

export async function fetchTrips(userId) {
  return request(`/trips?userId=${userId}`);
}

export async function fetchTripDetails(tripId) {
  return request(`/trips/${tripId}`);
}

export async function createTrip(tripData) {
  return request('/trips', {
    method: 'POST',
    body: JSON.stringify(tripData),
  });
}

export async function createStop(stopData) {
  return request('/stops', {
    method: 'POST',
    body: JSON.stringify(stopData),
  });
}

export async function createActivity(activityData) {
  return request('/activities', {
    method: 'POST',
    body: JSON.stringify(activityData),
  });
}

export async function fetchExpenses(tripId) {
  return request(`/expenses/${tripId}`);
}

export async function createExpense(expenseData) {
  return request('/expenses', {
    method: 'POST',
    body: JSON.stringify(expenseData),
  });
}

export async function deleteExpense(expenseId) {
  return request(`/expenses/${expenseId}`, { method: 'DELETE' });
}

export async function fetchChecklist(tripId) {
  return request(`/checklist/${tripId}`);
}

export async function createChecklistItem(itemData) {
  return request('/checklist', {
    method: 'POST',
    body: JSON.stringify(itemData),
  });
}

export async function updateChecklistItem(itemId, completed) {
  return request(`/checklist/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
}

export async function resetChecklist(tripId) {
  return request(`/checklist/${tripId}/reset`, { method: 'POST' });
}

export async function deleteChecklistItem(itemId) {
  return request(`/checklist/${itemId}`, { method: 'DELETE' });
}

export async function fetchNotes(tripId) {
  return request(`/notes/${tripId}`);
}

export async function createNote(noteData) {
  return request('/notes', {
    method: 'POST',
    body: JSON.stringify(noteData),
  });
}

export async function deleteNote(noteId) {
  return request(`/notes/${noteId}`, { method: 'DELETE' });
}

export async function updateTrip(tripId, tripData) {
  return request(`/trips/${tripId}`, {
    method: 'PATCH',
    body: JSON.stringify(tripData),
  });
}

export async function deleteTrip(tripId) {
  return request(`/trips/${tripId}`, { method: 'DELETE' });
}

export async function deleteStop(stopId) {
  return request(`/stops/${stopId}`, { method: 'DELETE' });
}

export async function deleteActivity(activityId) {
  return request(`/activities/${activityId}`, { method: 'DELETE' });
}

export async function fetchDiscovery(query = '', type = '') {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (type) params.set('type', type);
  return request(`/discovery?${params.toString()}`);
}

export async function createShare(tripId, shareType = 'public', friendEmail = '') {
  return request(`/shares/trips/${tripId}`, {
    method: 'POST',
    body: JSON.stringify({ shareType, friendEmail }),
  });
}

export async function fetchSharedTrip(publicCode) {
  return request(`/shares/${publicCode}`);
}

export async function fetchBudgetSummary(tripId) {
  return request(`/trips/${tripId}/budget-summary`);
}

export async function signup(payload) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchHotels(city = '', country = '', maxPrice = '', stars = '') {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (country) params.set('country', country);
  if (maxPrice) params.set('maxPrice', maxPrice);
  if (stars) params.set('stars', stars);
  return request(`/hotels?${params.toString()}`);
}

export async function fetchHotelBookings(tripId) {
  return request(`/hotels/bookings/${tripId}`);
}

export async function createHotelBooking(bookingData) {
  return request('/hotels/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
}

export async function cancelHotelBooking(bookingId) {
  return request(`/hotels/bookings/${bookingId}`, { method: 'DELETE' });
}
