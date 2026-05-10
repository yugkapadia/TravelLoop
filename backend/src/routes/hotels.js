const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { cleanText, isValidDateString, parseAmount, parsePositiveInt } = require('../utils/request');

// GET /api/hotels?city=Tokyo&maxPrice=200&stars=4&country=Japan
router.get('/', asyncHandler(async (req, res) => {
  const city = cleanText(req.query.city);
  const country = cleanText(req.query.country);
  const maxPrice = parseAmount(req.query.maxPrice) || 99999;
  const stars = parsePositiveInt(req.query.stars);

  const filters = ['price_per_night <= ?'];
  const params = [maxPrice];

  if (city) {
    filters.push('LOWER(city) LIKE ?');
    params.push(`%${city.toLowerCase()}%`);
  }
  if (country) {
    filters.push('LOWER(country) LIKE ?');
    params.push(`%${country.toLowerCase()}%`);
  }
  if (stars) {
    filters.push('stars = ?');
    params.push(stars);
  }

  const where = `WHERE ${filters.join(' AND ')}`;
  const hotels = await allQuery(
    `SELECT * FROM hotels ${where} ORDER BY stars DESC, rating DESC, price_per_night ASC`,
    params
  );
  res.json({ hotels });
}));

// GET /api/hotels/:hotelId
router.get('/:hotelId', asyncHandler(async (req, res) => {
  const hotelId = parsePositiveInt(req.params.hotelId);
  if (!hotelId) return res.status(400).json({ error: 'Valid hotelId is required.' });
  const hotel = await getQuery('SELECT * FROM hotels WHERE id = ?', [hotelId]);
  if (!hotel) return res.status(404).json({ error: 'Hotel not found.' });
  res.json({ hotel });
}));

// GET /api/hotels/bookings/:tripId
router.get('/bookings/:tripId', asyncHandler(async (req, res) => {
  const tripId = parsePositiveInt(req.params.tripId);
  if (!tripId) return res.status(400).json({ error: 'Valid tripId is required.' });

  const bookings = await allQuery(
    `SELECT hb.*, h.name AS hotel_name, h.city, h.country, h.stars,
            h.rating, h.amenities, h.address, h.price_per_night
     FROM hotel_bookings hb
     JOIN hotels h ON hb.hotel_id = h.id
     WHERE hb.trip_id = ? AND hb.status != 'cancelled'
     ORDER BY hb.check_in ASC`,
    [tripId]
  );
  res.json({ bookings });
}));

// POST /api/hotels/bookings
router.post('/bookings', asyncHandler(async (req, res) => {
  const { tripId, hotelId, checkIn, checkOut, guests } = req.body;
  const parsedTripId = parsePositiveInt(tripId);
  const parsedHotelId = parsePositiveInt(hotelId);

  if (!parsedTripId || !parsedHotelId) {
    return res.status(400).json({ error: 'tripId and hotelId are required.' });
  }
  if (!isValidDateString(checkIn) || !isValidDateString(checkOut) || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'checkIn and checkOut dates are required (YYYY-MM-DD).' });
  }
  if (checkIn >= checkOut) {
    return res.status(400).json({ error: 'checkOut must be after checkIn.' });
  }

  const hotel = await getQuery('SELECT * FROM hotels WHERE id = ?', [parsedHotelId]);
  if (!hotel) return res.status(404).json({ error: 'Hotel not found.' });

  const nights = Math.max(1, Math.ceil(
    (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
  ));
  const parsedGuests = Math.max(1, parsePositiveInt(guests) || 1);
  const totalPrice = parseFloat((hotel.price_per_night * nights).toFixed(2));

  const result = await runQuery(
    `INSERT INTO hotel_bookings (trip_id, hotel_id, check_in, check_out, guests, total_price, status)
     VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`,
    [parsedTripId, parsedHotelId, checkIn, checkOut, parsedGuests, totalPrice]
  );

  // Auto-add as expense so it shows in budget
  await runQuery(
    `INSERT INTO expenses (trip_id, category, amount, notes)
     VALUES (?, 'Stay', ?, ?)`,
    [parsedTripId, totalPrice, `Hotel: ${hotel.name} (${nights} night${nights > 1 ? 's' : ''})`]
  );

  res.status(201).json({
    booking: {
      id: result.lastID,
      trip_id: parsedTripId,
      hotel_id: parsedHotelId,
      hotel_name: hotel.name,
      city: hotel.city,
      country: hotel.country,
      stars: hotel.stars,
      rating: hotel.rating,
      address: hotel.address,
      amenities: hotel.amenities,
      check_in: checkIn,
      check_out: checkOut,
      guests: parsedGuests,
      nights,
      total_price: totalPrice,
      price_per_night: hotel.price_per_night,
      status: 'confirmed',
    },
  });
}));

// DELETE /api/hotels/bookings/:bookingId  (cancel)
router.delete('/bookings/:bookingId', asyncHandler(async (req, res) => {
  const bookingId = parsePositiveInt(req.params.bookingId);
  if (!bookingId) return res.status(400).json({ error: 'Valid bookingId is required.' });

  const result = await runQuery(
    "UPDATE hotel_bookings SET status = 'cancelled' WHERE id = ?",
    [bookingId]
  );
  if (!result.changes) return res.status(404).json({ error: 'Booking not found.' });
  res.status(204).end();
}));

module.exports = router;
