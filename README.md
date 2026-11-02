# Gate Display

Airport gate display system for showing live flight information on screens at airport gates.

This project reads flight data from a SQL Server database and serves a React-based display frontend. The backend exposes the data to the frontend and can also be used to manage flight status updates.

## Features

- Reads departure/arrival flight data from SQL Server
- Displays gate information on a large screen layout
- Shows flight details such as destination, time, airline, and status
- Supports multiple display modes via URL parameters
- Includes backend APIs for health checks and operator updates
- Built with Node.js + Express on the backend and React + Vite on the frontend

## Project structure

```text
gate-display/
├── backend/              Node.js + Express API (port 5000)
│   ├── src/
│   │   ├── server.js     API server and frontend serving logic
│   │   ├── db.js         SQL Server connection setup
│   │   ├── ip.js         Detect display IP address
│   │   ├── queries.js    Flight querying and display logic
│   │   └── operator.js   Flight status update API for operators
│   ├── .env.example      Copy to .env and fill in your values
│   └── package.json
├── frontend/             React + Vite app
│   ├── src/              App.jsx, AdScreen.jsx, FitText.jsx, Clock.jsx, etc.
│   ├── public/images/    logos, background images, airline images, city images
│   ├── public/videos/    promotional video files
│   └── package.json
├── database/             SQL scripts
├── display-pc/           Windows display scripts (start-display.bat)
└── README.md
```

## Requirements

- Node.js 18 or newer
- SQL Server database with the required flight table data
- Access to the database credentials for the backend

## Setup

### 1. Backend

Open a terminal and run:

```bash
cd backend
npm install
```

Create a copy of `.env.example` and rename it to `.env`.

Then update the environment variables with your database and runtime settings.

### 2. Frontend

Install the frontend dependencies and build the app:

```bash
cd frontend
npm install
npm run build
```

### 3. Add images and media

Place your required assets inside the `frontend/public/` folder.

The project includes a placeholder file in the public folder that explains how to add images and media files.

### 4. Run the project

Start the backend:

```bash
cd backend
npm start
```

Then open the application in a browser:

- Local: `http://localhost:5000`
- From another machine: `http://<server-ip>:5000`

## Configuration (`backend/.env`)

The backend uses environment variables for filtering and display behavior.

| Setting | Description |
|---|---|
| `SHOW_BEFORE_MINUTES` | Number of minutes before departure when a flight should appear |
| `SHOW_AFTER_MINUTES` | Number of minutes after departure when a flight remains visible |
| `HIDE_REMARKS` | Hide flights that contain remarks |
| `SCHEDULED_TEXT` | Text shown in the status band when a flight has no remark |

After changing any environment value, restart the backend service.

## Testing and debugging

### View a different display mode

Add a query parameter such as `?ip=10.0.0.5` to the end of the URL to simulate a different display target.

### Run frontend in development mode

```bash
cd frontend
npm run dev
```

During frontend development, the backend should also be running.

### Check database connectivity

Open the following in the browser:

```text
http://localhost:5000/api/health
```

## Notes

- The frontend is served by the backend after the build step.
- The system is designed for airport gate display screens and can be adjusted for different display layouts or flight rules.
- If a different display computer or location is needed, update the relevant IP-based display configuration in the backend logic.

## License

This project does not currently include a license file. If needed, add one according to your organization or project requirements.

## Contributing

This project is intended for local deployment and internal use. Contributions are welcome if they improve stability, visual quality, accessibility, or deployment support.

## Troubleshooting

- Ensure the SQL Server connection details in `.env` are correct.
- Confirm the Node.js version is 18 or newer.
- Rebuild the frontend after making UI changes.
- Restart the backend after editing environment variables or API logic.

## Quick start summary

```bash
cd backend
npm install
cp .env.example .env
# edit .env with database values
npm start
```

Then open:

```text
http://localhost:5000
```

This project is ready for use as a gate display system once the database, frontend assets, and environment configuration are in place.
