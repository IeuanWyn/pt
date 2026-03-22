# 10k Training Plan App

A personalised 10k running training plan app for a complete beginner, featuring Strava integration, a Claude AI coach, and full database persistence.

## Tech Stack

- **Frontend:** Vite + React + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MariaDB
- **Strava:** OAuth 2.0 + activities sync
- **AI Coach:** Anthropic Claude API

---

## Prerequisites

- Node.js 18+
- MariaDB / MySQL
- A Strava account (optional but recommended)
- An Anthropic API key

---

## 1. Database Setup (MariaDB)

Log into MariaDB as root and run:

```sql
CREATE DATABASE training_plan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'training_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON training_plan.* TO 'training_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

The app will automatically create all required tables on first run.

---

## 2. Strava API Setup

1. Go to [https://www.strava.com/settings/api](https://www.strava.com/settings/api)
2. Create a new application:
   - **Application Name:** 10k Training Plan (or anything you like)
   - **Category:** Other
   - **Website:** `http://localhost:5173`
   - **Authorization Callback Domain:** `localhost`
3. Note your **Client ID** and **Client Secret**
4. Set the redirect URI in your `.env` to:
   ```
   STRAVA_REDIRECT_URI=http://localhost:3001/auth/strava/callback
   ```

> **Note:** Strava is optional — the app works fully without it for manual session logging.

---

## 3. Anthropic API Key

1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to **API Keys** and create a new key
4. Copy the key (starts with `sk-ant-...`)

> **Note:** Claude AI coach is optional — the rest of the app works without it.

---

## 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=training_user
DB_PASSWORD=your_secure_password
DB_NAME=training_plan

# Strava (optional)
STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=abc123...
STRAVA_REDIRECT_URI=http://localhost:3001/auth/strava/callback

# Anthropic (optional)
ANTHROPIC_API_KEY=sk-ant-...

# Server
PORT=3001
CLIENT_URL=http://localhost:5173
```

---

## 5. Install Dependencies

```bash
npm run install:all
```

This installs packages for the root, server, and client in one command.

---

## 6. Run the App

```bash
npm run dev
```

This starts both the API server (port 3001) and the Vite dev server (port 5173) concurrently.

Open your browser at: **[http://localhost:5173](http://localhost:5173)**

---

## 7. Access on Local Network (Other Devices)

To open the app on your phone or another device on the same WiFi:

1. Find your machine's local IP address:
   - **Linux/Mac:** `ip addr show` or `ifconfig` — look for `192.168.x.x` or `10.x.x.x`
   - **Windows:** `ipconfig` — look for IPv4 Address

2. On the other device, open a browser and go to:
   ```
   http://192.168.x.x:5173
   ```
   Replace `192.168.x.x` with your actual LAN IP.

3. If using Strava OAuth, update your `.env`:
   ```
   STRAVA_REDIRECT_URI=http://192.168.x.x:3001/auth/strava/callback
   CLIENT_URL=http://192.168.x.x:5173
   ```

---

## Project Structure

```
/
├── client/                 # Vite React frontend
│   ├── src/
│   │   ├── components/     # Shared UI components
│   │   ├── context/        # React context (app state)
│   │   ├── pages/          # Tab pages (Dashboard, Plan, etc.)
│   │   ├── api.js          # Axios API calls
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── server/                 # Express API
│   ├── routes/
│   │   ├── auth.js         # Strava OAuth callback
│   │   ├── chat.js         # Claude AI chat
│   │   ├── plan.js         # Profile & plan progress
│   │   ├── sessions.js     # Session log CRUD
│   │   └── strava.js       # Strava sync & status
│   ├── services/
│   │   ├── claude.js       # Claude API integration
│   │   ├── db.js           # MariaDB connection & schema
│   │   └── strava.js       # Strava OAuth & sync logic
│   └── server.js
│
├── .env                    # Your config (not committed)
├── .env.example            # Template
└── package.json            # Root — runs both with concurrently
```

---

## App Features

### Dashboard
- Stats bar: phase, weeks to race, sessions logged
- "My Story" card with motivational tagline
- Recent Strava activity feed
- Quick access to Sync Strava and Coach

### Plan (4 phases)
- **Phase 1 – Foundation** (Now → April): Zwift, walking, calf rehab with checklist
- **Phase 2 – Run/Walk** (May → June): Week-by-week interval progression, markable complete
- **Phase 3 – Base Building** (July → September): Easy/long/tempo runs, 5k milestone
- **Phase 4 – 10k Prep** (October → November): Race countdown, taper guidance

### Session Log
- Merged manual + Strava sessions
- Filter by type and date range
- Calf feel rating (1–5 emoji scale)
- Personal bests: first run, longest run, longest continuous run

### Coach (Claude AI)
- Full chat interface with markdown rendering
- Chat history persisted in DB
- Quick actions: plan adjustment, progress check, calf pain advice
- Birthday greeting on 7th October

### Profile / Settings
- Edit all personal details
- Connect / disconnect Strava
- Race date picker
- Clear all data option

---

## Security Notes

- All Claude API calls are server-side only — the API key is never exposed to the browser
- Strava token refresh happens server-side and silently
- All database queries use parameterised statements
- Strava rate limits (429) are handled gracefully

---

## Troubleshooting

**Server won't start — database connection error:**
Check your DB credentials in `.env` and ensure MariaDB is running.

**Strava connect fails:**
Ensure your Client ID and Secret are correct. The redirect URI in Strava's API settings must match `STRAVA_REDIRECT_URI` in `.env` exactly.

**Claude AI not responding:**
Check your `ANTHROPIC_API_KEY` in `.env`. The key must have credits available.

**App loads but shows blank page:**
Check the browser console for errors. The Vite proxy (`/api`) requires the server to be running on port 3001.

---

## Docker / Portainer Deployment

Three containers are defined: `db` (MariaDB 11), `server` (Node/Express), `client` (React built by Vite, served via nginx). Nginx proxies `/api/` and `/auth/` to the server container — no extra ports are exposed for the backend.

### Portainer Stack (recommended)

1. In Portainer go to **Stacks → Add stack**
2. Choose **Repository** and enter your GitHub repo URL
3. Set the **Compose path** to `docker-compose.yml`
4. Under **Environment variables** add the values from `.env.docker.example`:

   | Variable | Example value |
   |---|---|
   | `MYSQL_ROOT_PASSWORD` | `strongrootpass` |
   | `DB_USER` | `training_user` |
   | `DB_PASSWORD` | `strongpass` |
   | `DB_NAME` | `training_plan` |
   | `APP_PORT` | `80` (or `8080` etc.) |
   | `STRAVA_CLIENT_ID` | *(from Strava API settings)* |
   | `STRAVA_CLIENT_SECRET` | *(from Strava API settings)* |
   | `STRAVA_REDIRECT_URI` | `http://YOUR_SERVER_IP/auth/strava/callback` |
   | `ANTHROPIC_API_KEY` | `sk-ant-...` |
   | `CLIENT_URL` | `http://YOUR_SERVER_IP` |

5. Click **Deploy the stack**

Portainer will pull the repo, build the images, and start all three containers. The app is then available at `http://YOUR_SERVER_IP` (or the port you set for `APP_PORT`).

### CLI (docker compose)

```bash
git clone https://github.com/IeuanWyn/pt.git
cd pt
cp .env.docker.example .env
# Edit .env with your values
docker compose up -d --build
```

### Strava OAuth with Docker

Because the OAuth redirect goes via the browser, the `STRAVA_REDIRECT_URI` must be the **public/LAN address of your server**, not `localhost`:

```
STRAVA_REDIRECT_URI=http://192.168.1.100/auth/strava/callback
CLIENT_URL=http://192.168.1.100
```

Also update the **Authorization Callback Domain** in your Strava API app settings to match your server's IP or hostname.

### Updating

In Portainer, go to the stack and click **Pull and redeploy**. The database volume (`db_data`) is preserved across rebuilds — your data is safe.