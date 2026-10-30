# Deploying TTT Cabs

Three pieces, set up in this order:

| Piece | Folder | Host |
|---|---|---|
| MySQL database | `server/src/schema.sql` (applied automatically) | TiDB Cloud |
| API (Express) | `server/` | Render |
| Website + admin (React) | repo root | Vercel |

## 1. TiDB Cloud (database)

1. Sign in at https://tidbcloud.com and create a **Starter (Serverless)** cluster. Pick the region closest to your customers (Mumbai `ap-south-1` if it's offered).
2. Open the cluster, then click **Connect**:
   - Connect with: **General**. Operating system: any.
   - Click **Generate password** and copy it. TiDB shows it only once.
3. Click **SQL Editor** and create the database:
   ```sql
   CREATE DATABASE tttcabs;
   ```
4. Build the connection string from the Connect dialog (host, port `4000`, user):
   ```
   mysql://<USER>:<PASSWORD>@<HOST>:4000/tttcabs
   ```
   The user looks like `xxxxxxxx.root`. If the password has special characters (`@ : / ? #`), URL-encode them.

You don't need to create tables. The API creates them on its first start.

## 2. Render (API)

1. Sign in at https://render.com, then choose **New → Blueprint** and connect the GitHub repo. Render reads `render.yaml`.
   Or set it up by hand: **New → Web Service**, with Root Directory `server`, Build `npm ci`, Start `npm start` and Health check `/api/health`.
2. Set these environment variables:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the TiDB string from step 1 |
   | `DB_SSL` | `true` (TiDB requires TLS) |
   | `JWT_SECRET` | the Blueprint generates it. If you set up by hand, run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `CORS_ORIGIN` | your Vercel URL, e.g. `https://taxi-booking.vercel.app` (use a comma to list several) |
   | `NODE_VERSION` | `22` |
3. Deploy. Then open `https://<your-service>.onrender.com/api/health`; it should return `{"ok":true}`.
4. Create the first admin: in the Render dashboard, open **Shell** and run
   ```
   ADMIN_EMAIL=you@yourdomain.com ADMIN_PASSWORD='a-long-password' ADMIN_NAME='Your Name' npm run create-admin
   ```
   (The free plan has no Shell. Run the same command on your own computer from the `server/` folder, with `DATABASE_URL` and `DB_SSL=true` set in `server/.env`.)

Free Render services sleep after 15 minutes without traffic, so the first request after that takes about 30 seconds. A paid instance stays awake.

## 3. Vercel (website and admin)

1. Sign in at https://vercel.com, then choose **Add New → Project** and import the GitHub repo.
2. Vercel detects Vite from `vercel.json`, so leave the Root Directory as the repo root.
3. Add this environment variable (Production and Preview):
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-service>.onrender.com` (no trailing slash) |
4. Deploy. Then go back to Render and make sure `CORS_ORIGIN` exactly matches the Vercel URL. Redeploy the API if you changed it.
5. Optional custom domain: in Vercel, open **Settings → Domains** and add `tttcabs.com`, then update DNS as Vercel shows. Add the new domain to `CORS_ORIGIN` too.

## 4. Check it works

1. Open the site, create an account at `/signup`, and make a booking.
2. Sign in at `/admin/login` with the admin from step 2.4. The booking appears under **Bookings**.
3. Set the booking to *Driver assigned* with a driver and a vehicle. The customer sees this under **My account**.

## Local development

```
# terminal 1: API
cd server
cp .env.example .env        # fill DATABASE_URL (local MySQL or TiDB) and JWT_SECRET
npm install
npm run dev                 # http://localhost:4000

# terminal 2: website
cp .env.example .env.local  # VITE_API_URL=http://localhost:4000
npm install
npm run dev                 # http://localhost:5173
```

Tests: `cd server && npm test`. Point `DATABASE_URL` at a test database, because the tests write records.
