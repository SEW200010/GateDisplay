require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const { getPool } = require('./db');
const { resolveClientIp } = require('./ip');
const { findDisplayByIp, findFlightForGates, findNextFlightForGates, getDbTime, checkFlights } = require('./queries');
const app = express();


app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await getPool();
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Called by every display every second
app.get('/api/display', async (req, res) => {
  const ip = resolveClientIp(req);
  const serverTime = new Date().toISOString();

  try {
    const display = await findDisplayByIp(ip);
    if (!display) {
      return res.status(404).json({ status: 'UNKNOWN_DISPLAY', ip, serverTime });
    }
    if (!display.active) {
      return res.json({ status: 'DISPLAY_DISABLED', ip, display, serverTime });
    }

    const flight = await findFlightForGates(display.gates);
    // While the advert plays, the strip under it shows the gate's next flight
    const nextFlight = flight ? null : await findNextFlightForGates(display.gates);
    // Displays time their refresh by the database clock, the clock the flight times are worked out on
    const dbTime = await getDbTime().catch(() => serverTime);
    res.json({ status: flight ? 'OK' : 'NO_FLIGHT', ip, display, flight, nextFlight, serverTime: dbTime });
  } catch (err) {
    console.error(`[${serverTime}] ${ip}:`, err.message);
    res.status(500).json({ status: 'ERROR', ip, error: err.message, serverTime });
  }
});

// Open in a browser to see why a flight does or does not show on this display:
//   http://localhost:5000/api/check          (this computer's display)
//   http://localhost:5000/api/check?ip=10.0.0.5   (another display, when ALLOW_IP_OVERRIDE=true)
app.get('/api/check', async (req, res) => {
  const ip = resolveClientIp(req);
  try {
    const display = await findDisplayByIp(ip);
    const gates = display ? display.gates : [];
    const flights = await checkFlights(gates);
    res.json({
      ip,
      display: display || 'NOT FOUND: this IP is not in tblGateDisplays (set SELF_IP in .env, or add the IP to the table)',
      gates,
      showMode: process.env.SHOW_MODE || 'remarks',
      showRemarks: process.env.SHOW_REMARKS || 'Gate Open,Now Boarding,Final Call',
      flights,
    });
  } catch (err) {
    res.status(500).json({ ip, error: err.message });
  }
});


// Serve the built React app (frontend/dist) so every display opens one URL
const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    // A missing file (e.g. /images/cities/DOH.jpg) gets a real 404, not the display page
    if (req.method !== 'GET' || req.path.startsWith('/api') || path.extname(req.path)) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}

const port = Number(process.env.PORT || 5000);
app.listen(port, '0.0.0.0', () => {
  console.log(`Gate display backend on http://0.0.0.0:${port}`);
  getPool()
    .then(() => console.log('SQL Server connected'))
    .catch((err) => console.error('SQL Server connection failed:', err.message));
});