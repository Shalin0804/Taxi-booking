# Deploying TTT Cabs

Three pieces, set up in this order:

| Piece | Folder | Host |
|---|---|---|
| MySQL database | `server/src/schema.sql` (applied automatically) | TiDB Cloud |
| API (Express) | `server/` | Render |
| Website, customer accounts, admin portal (React) | repo root | Vercel |

The browser only ever talks to the Vercel domain. `vercel.json` forwards `/api/*` to Render, so the httpOnly session cookies are first-party and work in every browser.

## 1. TiDB Cloud (database)

1. Go to https://tidbcloud.com and create a **Starter (Serverless)** cluster in the region nearest your customers (Mumbai if it's offered).
2. Click **Connect**, then **Generate password**, and copy it. TiDB shows it only once.
3. In the **SQL Editor**, run `CREATE DATABASE tttcabs;`
4. Your connection string is `mysql://<USER>:<PASSWORD>@<HOST>:4000/tttcabs`. URL-encode any `@ : / ? #` in the password.

The API creates every table on its first start.

## 2. Render (API)

1. Go to https://render.com, choose **New → Blueprint**, and pick the GitHub repo. Render reads `render.yaml`.
2. Fill in the variables it asks for:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the TiDB string |
   | `APP_URL` | your Vercel URL, e.g. `https://taxi-booking.vercel.app` |
   | `CORS_ORIGIN` | the same Vercel URL |
   | `SMTP_URL` | optional, e.g. `smtps://you%40gmail.com:APP_PASSWORD@smtp.gmail.com:465`. Without it, password-reset links only appear in the Render log. |
   | `MAIL_FROM` | optional, e.g. `TTT Cabs <no-reply@tttcabs.com>` |

   `JWT_SECRET` is generated for you. `NODE_ENV=production`, `DB_SSL=true` and `TRUST_PROXY=2` are already set.
3. The live API is `https://tttcabs-api-jkkn.onrender.com`, the address `vercel.json` forwards `/api` to. If the Render URL ever changes, update `vercel.json` and push.
4. Check `https://tttcabs-api-jkkn.onrender.com/api/health`. It should return `{"ok":true}`.
5. **Create the first SUPER_ADMIN.** There is no admin sign-up page. Run this once, either in the Render **Shell** (paid plans) or on your computer from `server/` with `DATABASE_URL` and `DB_SSL=true` in `server/.env`:
   ```
   ADMIN_EMAIL=you@yourdomain.com ADMIN_PASSWORD='a-long-unique-password' ADMIN_NAME='Your Name' npm run create-admin
   ```
   Then add other staff from the portal's **Team & roles** page.

## 3. Vercel (website)

1. Go to https://vercel.com, choose **Add New → Project**, and import the repo. Keep the Root Directory as the repo root.
2. You don't need any environment variables, because `/api` is forwarded by `vercel.json`.
3. Deploy. If the URL differs from the `APP_URL` / `CORS_ORIGIN` you gave Render, update them there.

## 4. Check it works

- **Customer:** open the site. "Plan your ride" should be locked. Register, book, then open **My account**.
- **Admin:** go to `https://<your-site>/secure-admin-portal` (it isn't linked anywhere) and sign in as the SUPER_ADMIN. The booking should appear under **Bookings**.

## Roles

| Role | Can |
|---|---|
| SUPER_ADMIN | Everything, including team, roles and the audit log |
| ADMIN | Bookings, customers, fleet, pricing, enquiries, reports |
| BOOKING_MANAGER | Bookings (edit, assign, export), reports, read fleet and pricing |
| FLEET_MANAGER | Vehicles and drivers |
| SUPPORT_STAFF | Customers, enquiries, read-only bookings |
| CUSTOMER | Their own profile and bookings, through the public site only |

## Local development

```
# terminal 1: API (needs MySQL; e.g. docker run -d -p 3307:3306 -e MYSQL_ROOT_PASSWORD=... -e MYSQL_DATABASE=tttcabs mysql:8.4)
cd server && cp .env.example .env    # fill DATABASE_URL and JWT_SECRET
npm install && npm run dev           # http://localhost:4000

# terminal 2: website (proxies /api to :4000)
npm install && npm run dev           # http://localhost:5173
```

Tests: run `cd server && npm test`, with `DATABASE_URL` pointing at a **test** database.
