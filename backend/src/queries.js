const { sql, getPool } = require('./db');

function list(value, fallback) {
  return String(value ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function num(value, fallback) {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback;
}

const ALLOWED_REMARKS = list(process.env.ALLOWED_REMARKS, 'Gate Open,Now Boarding,Final Call');
const SHOW_MODE = String(process.env.SHOW_MODE || 'remarks').trim().toLowerCase() === 'time' ? 'time' : 'remarks';
const SHOW_REMARKS = list(process.env.SHOW_REMARKS, 'Gate Open,Now Boarding,Final Call');
const STALE_AFTER_HOURS = num(process.env.STALE_AFTER_HOURS, 0);
const NEXT_FLIGHT_HOURS = num(process.env.NEXT_FLIGHT_HOURS, 24);

// Flights with one of these remarks never show
const HIDE_REMARKS = list(process.env.HIDE_REMARKS, 'Gate Closed,Departed,Cancelled');

const SCHEDULED_TEXT = process.env.SCHEDULED_TEXT || 'Scheduled';

const REMARK_PRIORITY = list(process.env.REMARK_PRIORITY, 'Final Call,Now Boarding,Boarding,Gate Open,Delayed');

function parseGates(locationArray) {
  if (locationArray == null) return [];
  return String(locationArray)
    .replace(/[[\]"']/g, '')
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isActive(status) {
  if (status == null) return true;
  const s = String(status).trim().toLowerCase();
  return s !== '0' && s !== 'false';
}

async function findDisplayByIp(ip) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('ip', sql.NVarChar(50), ip)
    .query(`
      SELECT TOP (1) CID, Name, IPAddress, LocationArray, DisplaySize,
             DisplayStatus, Remarks, DisplayMode, Side, timetogate
      FROM dbo.tblGateDisplays
      WHERE LTRIM(RTRIM(IPAddress)) = @ip
      ORDER BY CID`);

  const row = result.recordset[0];
  if (!row) return null;

  return {
    cid: row.CID,
    name: row.Name,
    ip: row.IPAddress,
    gates: parseGates(row.LocationArray),
    displaySize: row.DisplaySize,
    displayMode: row.DisplayMode,
    side: row.Side,
    timeToGate: row.timetogate,
    active: isActive(row.DisplayStatus),
  };
}

async function newFlightsRequest(gates) {
  const pool = await getPool();
  const request = pool.request();

  const gateParams = gates.map((g, i) => {
    request.input(`g${i}`, sql.NVarChar(20), g);
    return `@g${i}`;
  });
  const hideParams = HIDE_REMARKS.map((r, i) => {
    request.input(`h${i}`, sql.NVarChar(50), r);
    return `@h${i}`;
  });
  const hideCond = hideParams.length
    ? `AND REMARKS NOT IN (${hideParams.join(', ')})
         AND REMARKS2 NOT IN (${hideParams.join(', ')})`
    : '';

  const priorityWhens = REMARK_PRIORITY.map((r, i) => {
    request.input(`pr${i}`, sql.NVarChar(60), `${r}%`);
    return `WHEN REMARKS LIKE @pr${i} OR REMARKS2 LIKE @pr${i} THEN ${i}`;
  });
  const priorityCase = priorityWhens.length
    ? `CASE ${priorityWhens.join(' ')} ELSE ${priorityWhens.length} END`
    : '0';

  request.input('nextHours', sql.Int, NEXT_FLIGHT_HOURS);
  request.input('staleHours', sql.Int, STALE_AFTER_HOURS);

  const cte = `
    WITH F AS (
      SELECT ID, FLIGHT, AIRLINE_CODE, CS, CITY, CITY_CODE, VIA, GATE, TERMINAL,
             ISNULL(LTRIM(RTRIM(REMARKS)),  '') AS REMARKS,
             ISNULL(LTRIM(RTRIM(REMARKS2)), '') AS REMARKS2,
             CONVERT(varchar(10), STD_DATE, 23)  AS STD_DATE,
             CONVERT(varchar(5),  STD_TIME, 108) AS STD_TIME,
             CONVERT(varchar(10), ETD_DATE, 23)  AS ETD_DATE,
             CONVERT(varchar(5),  ETD_TIME, 108) AS ETD_TIME
      FROM dbo.TblDeparture
      WHERE ACTIVE_STATUS = 1
        AND DISPLAY_STATUS = 1
        AND LTRIM(RTRIM(GATE)) IN (${gateParams.join(', ')})
    ), T AS (
      SELECT *,
             CASE WHEN ETD_TIME IS NOT NULL
                  THEN COALESCE(ETD_DATE, STD_DATE, CONVERT(varchar(10), GETDATE(), 23)) + ' ' + ETD_TIME
                  ELSE COALESCE(STD_DATE, CONVERT(varchar(10), GETDATE(), 23)) + ' ' + STD_TIME
             END AS DEP_KEY,
             ${priorityCase} AS PRIORITY
      FROM F
    )`;

  return { request, cte, hideCond };
}

function toFlight(f) {
  // REMARKS2 is normally empty; when it has a value (e.g. 'Delayed Until 10:20AM') it wins
  const scheduled = !f.REMARKS2 && !f.REMARKS;
  return {
    id: f.ID,
    flight: f.FLIGHT,
    airline: f.AIRLINE_CODE,
    codeShare: f.CS,
    city: f.CITY,
    cityCode: f.CITY_CODE,
    via: f.VIA,
    gate: f.GATE,
    terminal: f.TERMINAL,
    stdDate: f.STD_DATE,
    stdTime: f.STD_TIME,
    etdDate: f.ETD_DATE,
    etdTime: f.ETD_TIME,
    departureTime: f.ETD_TIME || f.STD_TIME,
    remark: f.REMARKS2 || f.REMARKS || SCHEDULED_TEXT,
    scheduled,
  };
}

async function findFlightForGates(gates) {
  if (!gates.length) return null;
  const { request, cte, hideCond } = await newFlightsRequest(gates);

  let showCond;
  if (SHOW_MODE === 'time') {
    showCond = `DEP_KEY <= CONVERT(varchar(16), DATEADD(MINUTE, @before, GETDATE()), 120)
            AND DEP_KEY >  CONVERT(varchar(16), DATEADD(MINUTE, -@after, GETDATE()), 120)
            ${hideCond}`;
  } else {
    const checks = SHOW_REMARKS.map((r, i) => {
      request.input(`s${i}`, sql.NVarChar(60), `${r}%`);
      return `REMARKS LIKE @s${i}`;
    });
    showCond = checks.length ? `(${checks.join(' OR ')})` : '1 = 0'; 
    if (STALE_AFTER_HOURS > 0) {
      showCond += `
            AND DEP_KEY > CONVERT(varchar(16), DATEADD(HOUR, -@staleHours, GETDATE()), 120)`;
    }
  }

  const result = await request.query(`${cte}
    SELECT TOP (1) * FROM T
    WHERE ${showCond}
    -- Two flights at once: the higher-priority remark wins (Final Call before Gate Open),
    -- then the one not yet departed, then the earliest
    ORDER BY PRIORITY,
             CASE WHEN DEP_KEY >= CONVERT(varchar(16), GETDATE(), 120) THEN 0 ELSE 1 END,
             DEP_KEY, ID`);

  const f = result.recordset[0];
  return f ? toFlight(f) : null;
}

async function findNextFlightForGates(gates) {
  if (!gates.length) return null;
  const { request, cte, hideCond } = await newFlightsRequest(gates);
  request.input('nextFrom', sql.Int, SHOW_MODE === 'time' ? SHOW_BEFORE_MINUTES : 0);

  const result = await request.query(`${cte}
    SELECT TOP (1) * FROM T
    WHERE DEP_KEY >  CONVERT(varchar(16), DATEADD(MINUTE, @nextFrom, GETDATE()), 120)
      AND DEP_KEY <= CONVERT(varchar(16), DATEADD(HOUR, @nextHours, GETDATE()), 120)
      ${hideCond}
    ORDER BY DEP_KEY, ID`);

  const f = result.recordset[0];
  return f ? toFlight(f) : null;
}

async function checkFlights(gates) {
  const pool = await getPool();
  const request = pool.request();
  const gateParams = gates.map((g, i) => {
    request.input(`g${i}`, sql.NVarChar(20), g);
    return `@g${i}`;
  });
  const remarkChecks = SHOW_REMARKS.map((r, i) => {
    request.input(`s${i}`, sql.NVarChar(60), `${r}%`);
    return `ISNULL(LTRIM(RTRIM(REMARKS)), '') LIKE @s${i}`;
  });
  const where = [
    gateParams.length ? `LTRIM(RTRIM(GATE)) IN (${gateParams.join(', ')})` : '',
    remarkChecks.length ? `(${remarkChecks.join(' OR ')})` : '',
  ].filter(Boolean).join(' OR ') || '1 = 0';

  const result = await request.query(`
    SELECT TOP (50) ID, FLIGHT, LTRIM(RTRIM(GATE)) AS GATE,
           ISNULL(LTRIM(RTRIM(REMARKS)), '') AS REMARKS,
           ISNULL(LTRIM(RTRIM(REMARKS2)), '') AS REMARKS2,
           ACTIVE_STATUS, DISPLAY_STATUS,
           CONVERT(varchar(10), STD_DATE, 23) AS STD_DATE,
           CONVERT(varchar(5), STD_TIME, 108) AS STD_TIME
    FROM dbo.TblDeparture
    WHERE ${where}
    ORDER BY ID DESC`);

  const starts = (text, list) => list.some((r) => text.toLowerCase().startsWith(r.toLowerCase()));
  return result.recordset.map((f) => {
    const rules = {
      gateMatches: gates.includes(String(f.GATE || '')),
      activeStatusIs1: String(f.ACTIVE_STATUS) === '1' || f.ACTIVE_STATUS === true,
      displayStatusIs1: String(f.DISPLAY_STATUS) === '1' || f.DISPLAY_STATUS === true,
      remarkPutsOnScreen: SHOW_MODE === 'remarks' ? starts(f.REMARKS, SHOW_REMARKS) : 'time mode: remark not used',
    };
    const failed = Object.entries(rules).filter(([, ok]) => ok === false).map(([name]) => name);
    return { ...f, rules, showsOnScreen: failed.length === 0, whyNot: failed };
  });
}

async function getDbTime() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT CONVERT(varchar(19), SYSDATETIMEOFFSET(), 126)
           + DATENAME(TZOFFSET, SYSDATETIMEOFFSET()) AS NOW_ISO`);
  return result.recordset[0].NOW_ISO;
}

module.exports = {
  getDbTime,
  checkFlights,
  parseGates,
  findDisplayByIp,
  findFlightForGates,
  findNextFlightForGates,
  ALLOWED_REMARKS,
};