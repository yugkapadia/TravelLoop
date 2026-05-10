import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchHotels, fetchHotelBookings, createHotelBooking, cancelHotelBooking } from '../services/api';
import { formatMoney, getUserLocale } from '../utils/currency';

const STARS = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];

function StarBadge({ count }) {
  return (
    <span className="star-badge" aria-label={`${count} stars`}>
      {STARS[count] || ''}
    </span>
  );
}

export default function HotelPage() {
  const { tripId } = useParams();
  const locale = getUserLocale();

  // Search state
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [stars, setStars] = useState('');
  const [hotels, setHotels] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);

  // Booking state
  const [bookings, setBookings] = useState([]);
  const [bookingForm, setBookingForm] = useState({ hotelId: null, checkIn: '', checkOut: '', guests: 1 });
  const [bookingHotel, setBookingHotel] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    loadBookings();
    // Load all hotels on mount
    searchHotels('', '', '', '');
  }, [tripId]);

  async function loadBookings() {
    try {
      const data = await fetchHotelBookings(tripId);
      setBookings(data.bookings || []);
    } catch (_) {}
  }

  async function searchHotels(c, co, mp, s) {
    setSearching(true);
    setSearchError('');
    try {
      const data = await fetchHotels(c, co, mp, s);
      setHotels(data.hotels || []);
      setSearched(true);
    } catch (err) {
      setSearchError(err.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    searchHotels(city, country, maxPrice, stars);
  }

  function openBookingForm(hotel) {
    setBookingHotel(hotel);
    setBookingForm({ hotelId: hotel.id, checkIn: '', checkOut: '', guests: 1 });
    setBookingError('');
  }

  function closeBookingForm() {
    setBookingHotel(null);
    setBookingError('');
  }

  async function handleBook(e) {
    e.preventDefault();
    if (!bookingForm.checkIn || !bookingForm.checkOut) {
      setBookingError('Please select check-in and check-out dates.');
      return;
    }
    setBookingLoading(true);
    setBookingError('');
    try {
      const data = await createHotelBooking({
        tripId: Number(tripId),
        hotelId: bookingForm.hotelId,
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut,
        guests: bookingForm.guests,
      });
      setBookings((prev) => [...prev, data.booking]);
      closeBookingForm();
    } catch (err) {
      setBookingError(err.message || 'Booking failed.');
    } finally {
      setBookingLoading(false);
    }
  }

  async function handleCancel(bookingId) {
    if (!window.confirm('Cancel this hotel booking?')) return;
    try {
      await cancelHotelBooking(bookingId);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (err) {
      alert(err.message || 'Failed to cancel booking.');
    }
  }

  // Compute nights for preview
  function getNights() {
    if (!bookingForm.checkIn || !bookingForm.checkOut) return 0;
    return Math.max(0, Math.ceil(
      (new Date(bookingForm.checkOut) - new Date(bookingForm.checkIn)) / (1000 * 60 * 60 * 24)
    ));
  }

  const nights = getNights();
  const previewTotal = bookingHotel ? bookingHotel.price_per_night * nights : 0;

  return (
    <main className="page-flow">
      <Link className="text-link" to={`/trip/${tripId}`}>← Back to itinerary</Link>

      <header className="toolbar">
        <div>
          <p className="eyebrow">Accommodation</p>
          <h1 className="page-header">Hotels</h1>
          <p>Search hotels by city, filter by budget and star rating, then book directly into your trip.</p>
        </div>
      </header>

      {/* My Bookings */}
      {bookings.length > 0 && (
        <section>
          <h2 style={{ marginBottom: '12px' }}>Your bookings</h2>
          <div className="hotel-bookings-list">
            {bookings.map((b) => (
              <div key={b.id} className="booking-card">
                <div className="booking-card-left">
                  <div className="booking-hotel-name">
                    <StarBadge count={b.stars} />
                    <strong>{b.hotel_name}</strong>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--muted)' }}>
                    {b.city}, {b.country}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '13px' }}>
                    {b.check_in} → {b.check_out} · {b.guests} guest{b.guests > 1 ? 's' : ''}
                  </p>
                  {b.address && (
                    <p style={{ margin: '4px 0', fontSize: '12px', color: 'var(--muted)' }}>{b.address}</p>
                  )}
                </div>
                <div className="booking-card-right">
                  <strong style={{ color: 'var(--primary-dark)', fontSize: '20px' }}>
                    {formatMoney(b.total_price, locale)}
                  </strong>
                  <span className="tag" style={{ background: '#e8f5e9', color: '#2e7d32' }}>Confirmed</span>
                  <button className="button-ghost danger" onClick={() => handleCancel(b.id)} type="button">
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search */}
      <form className="surface stack" onSubmit={handleSearch}>
        <div>
          <p className="eyebrow">Find a hotel</p>
          <h2>Search</h2>
        </div>
        <div className="hotel-search-grid">
          <label>
            City
            <input placeholder="Tokyo, Paris, Dubai..." value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <label>
            Country
            <input placeholder="Japan, France..." value={country} onChange={(e) => setCountry(e.target.value)} />
          </label>
          <label>
            Max price / night
            <input type="number" min="0" placeholder="e.g. 200" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </label>
          <label>
            Stars
            <select value={stars} onChange={(e) => setStars(e.target.value)}>
              <option value="">Any</option>
              <option value="5">5 ★★★★★</option>
              <option value="4">4 ★★★★</option>
              <option value="3">3 ★★★</option>
              <option value="2">2 ★★</option>
            </select>
          </label>
        </div>
        <button className="button-primary" type="submit" disabled={searching}>
          {searching ? 'Searching...' : 'Search hotels'}
        </button>
      </form>

      {searchError && <div className="alert-error">{searchError}</div>}

      {searched && hotels.length === 0 && !searching && (
        <div className="empty-state compact">No hotels found. Try adjusting your filters.</div>
      )}

      {/* Results */}
      {hotels.length > 0 && (
        <section>
          <p style={{ marginBottom: '12px', color: 'var(--muted)', fontSize: '14px' }}>
            {hotels.length} hotel{hotels.length !== 1 ? 's' : ''} found
          </p>
          <div className="hotel-grid">
            {hotels.map((hotel) => (
              <article key={hotel.id} className="hotel-card">
                <div className="hotel-card-header">
                  <div>
                    <StarBadge count={hotel.stars} />
                    <h3 className="hotel-name">{hotel.name}</h3>
                    <p className="hotel-location">{hotel.city}, {hotel.country}</p>
                  </div>
                  <div className="hotel-rating-badge">
                    <span>{hotel.rating}</span>
                    <small>/ 5</small>
                  </div>
                </div>

                {hotel.description && (
                  <p className="hotel-description">{hotel.description}</p>
                )}

                {hotel.amenities && (
                  <div className="hotel-amenities">
                    {hotel.amenities.split(',').map((a) => (
                      <span key={a.trim()} className="amenity-tag">{a.trim()}</span>
                    ))}
                  </div>
                )}

                {hotel.address && (
                  <p className="hotel-address">📍 {hotel.address}</p>
                )}

                <div className="hotel-card-footer">
                  <div>
                    <strong className="hotel-price">{formatMoney(hotel.price_per_night, locale)}</strong>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}> / night</span>
                  </div>
                  <button
                    className="button-primary"
                    onClick={() => openBookingForm(hotel)}
                    type="button"
                  >
                    Book now
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Booking Modal */}
      {bookingHotel && (
        <div className="modal-overlay" onClick={closeBookingForm}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <StarBadge count={bookingHotel.stars} />
                <h2 style={{ margin: '4px 0 0' }}>{bookingHotel.name}</h2>
                <p style={{ margin: '2px 0', fontSize: '14px' }}>{bookingHotel.city}, {bookingHotel.country}</p>
              </div>
              <button className="modal-close" onClick={closeBookingForm} type="button">✕</button>
            </div>

            <form className="stack" onSubmit={handleBook}>
              <div className="form-grid">
                <label>
                  Check-in
                  <input
                    type="date"
                    value={bookingForm.checkIn}
                    onChange={(e) => setBookingForm((f) => ({ ...f, checkIn: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Check-out
                  <input
                    type="date"
                    value={bookingForm.checkOut}
                    onChange={(e) => setBookingForm((f) => ({ ...f, checkOut: e.target.value }))}
                    required
                  />
                </label>
              </div>
              <label>
                Guests
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={bookingForm.guests}
                  onChange={(e) => setBookingForm((f) => ({ ...f, guests: Number(e.target.value) }))}
                />
              </label>

              {nights > 0 && (
                <div className="booking-preview">
                  <div className="booking-preview-row">
                    <span>{formatMoney(bookingHotel.price_per_night, locale)} × {nights} night{nights > 1 ? 's' : ''}</span>
                    <strong>{formatMoney(previewTotal, locale)}</strong>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                    This will be added to your trip budget automatically.
                  </p>
                </div>
              )}

              {bookingError && <div className="alert-error">{bookingError}</div>}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="button-primary button-full" type="submit" disabled={bookingLoading}>
                  {bookingLoading ? 'Booking...' : `Confirm booking${nights > 0 ? ` · ${formatMoney(previewTotal, locale)}` : ''}`}
                </button>
                <button className="button-secondary" onClick={closeBookingForm} type="button">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
