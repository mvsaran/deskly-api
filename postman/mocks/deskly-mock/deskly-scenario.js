const desks = [
  {
    id: 'desk-101',
    name: 'Window Desk 101',
    zone: 'north',
    floor: 1,
    features: ['monitor', 'standing-desk'],
    available: true,
  },
  {
    id: 'desk-202',
    name: 'Focus Desk 202',
    zone: 'south',
    floor: 2,
    features: ['quiet-zone', 'dock'],
    available: false,
  },
  {
    id: 'desk-303',
    name: 'Collaboration Desk 303',
    zone: 'east',
    floor: 3,
    features: ['whiteboard', 'monitor'],
    available: true,
  },
];

let bookings = [
  {
    id: 'booking-1001',
    deskId: 'desk-202',
    date: '2026-02-17',
    userId: 'user-42',
    status: 'confirmed',
    createdAt: '2026-02-01T09:00:00.000Z',
  },
  {
    id: 'booking-1002',
    deskId: 'desk-101',
    date: '2026-02-18',
    userId: 'user-84',
    status: 'confirmed',
    createdAt: '2026-02-02T10:30:00.000Z',
  },
];

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendNoContent(res) {
  res.writeHead(204);
  res.end();
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
    });

    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function getPathParts(pathname) {
  return pathname.split('/').filter(Boolean);
}

async function handleDesklyScenario(req, res, context = {}) {
  const url = context.url || new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const parts = getPathParts(url.pathname);

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'deskly',
      version: '1.0.0',
      uptimeSeconds: Math.floor((Date.now() - (context.startedAt || Date.now())) / 1000),
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/desks') {
    const zone = url.searchParams.get('zone');
    const filteredDesks = zone ? desks.filter((desk) => desk.zone === zone) : desks;

    sendJson(res, 200, {
      data: filteredDesks,
      count: filteredDesks.length,
    });
    return true;
  }

  if (req.method === 'GET' && parts[0] === 'desks' && parts.length === 2) {
    const desk = desks.find((item) => item.id === parts[1]);

    if (!desk) {
      sendJson(res, 404, {
        error: 'desk_not_found',
        message: `Desk ${parts[1]} was not found`,
      });
      return true;
    }

    sendJson(res, 200, desk);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/bookings') {
    const date = url.searchParams.get('date');
    const deskId = url.searchParams.get('deskId');
    const filteredBookings = bookings.filter((booking) => {
      return (!date || booking.date === date) && (!deskId || booking.deskId === deskId);
    });

    sendJson(res, 200, {
      data: filteredBookings,
      count: filteredBookings.length,
    });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/bookings') {
    let body;

    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, {
        error: 'invalid_json',
        message: 'Request body must be valid JSON',
      });
      return true;
    }

    const missingFields = ['deskId', 'date', 'userId'].filter((field) => !body[field]);

    if (missingFields.length > 0) {
      sendJson(res, 400, {
        error: 'validation_error',
        message: 'deskId, date, and userId are required',
        missingFields,
      });
      return true;
    }

    const desk = desks.find((item) => item.id === body.deskId);

    if (!desk) {
      sendJson(res, 404, {
        error: 'desk_not_found',
        message: `Desk ${body.deskId} was not found`,
      });
      return true;
    }

    const existingBooking = bookings.find((booking) => {
      return booking.deskId === body.deskId && booking.date === body.date && booking.status === 'confirmed';
    });

    if (existingBooking) {
      sendJson(res, 409, {
        error: 'desk_already_booked',
        message: `Desk ${body.deskId} is already booked for ${body.date}`,
        bookingId: existingBooking.id,
      });
      return true;
    }

    const booking = {
      id: `booking-${Date.now()}`,
      deskId: body.deskId,
      date: body.date,
      userId: body.userId,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    bookings = [booking, ...bookings];

    sendJson(res, 201, booking);
    return true;
  }

  if (parts[0] === 'bookings' && parts.length === 2) {
    const bookingIndex = bookings.findIndex((booking) => booking.id === parts[1]);

    if (req.method === 'GET') {
      if (bookingIndex === -1) {
        sendJson(res, 404, {
          error: 'booking_not_found',
          message: `Booking ${parts[1]} was not found`,
        });
        return true;
      }

      sendJson(res, 200, bookings[bookingIndex]);
      return true;
    }

    if (req.method === 'DELETE') {
      if (bookingIndex === -1) {
        sendJson(res, 404, {
          error: 'booking_not_found',
          message: `Booking ${parts[1]} was not found`,
        });
        return true;
      }

      bookings.splice(bookingIndex, 1);
      sendNoContent(res);
      return true;
    }
  }

  return false;
}

module.exports = {
  handleDesklyScenario,
  desks,
  get bookings() {
    return bookings;
  },
};
