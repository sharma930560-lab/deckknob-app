# Database Setup Guide (Free Hosted Database)

To allow other users to access the application and save their data concurrently from different locations, you should use a cloud-hosted database rather than local SQLite. Follow this step-by-step guide to set up a free cloud database on Neon.tech.

---

## 1. Create a Free Neon Database

1. Go to [Neon.tech](https://neon.tech) and sign up for a free account.
2. Create a new project:
   - **Name**: `deckknob`
   - **Postgres Version**: Keep default (usually `16` or `17`)
   - **Region**: Select the region closest to you or your users.
3. Once created, Neon will show you a connection string. Copy the **Connection Details** connection string. It will look like this:
   ```env
   postgres://username:password@ep-host-name.region.aws.neon.tech/neondb?sslmode=require
   ```

---

## 2. Configure environment variables (.env)

Navigate to the `backend/` directory and update the `.env` file (or create one if it doesn't exist) with the connection string you copied:

```env
DATABASE_URL=postgres://username:password@ep-host-name.region.aws.neon.tech/neondb?sslmode=require
SECRET_KEY=your_secret_key_here
DEBUG=True
ALLOWED_HOSTS=*
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

---

## 3. Apply Migrations

Once the `DATABASE_URL` is set, Django automatically swaps from SQLite to your remote Postgres database. Run migrations to initialize the database schema on Postgres:

```bash
# Activate your virtual environment
venv\Scripts\activate

# Apply migrations
python backend/manage.py migrate
```

---

## 4. Run the Servers

Start the backend server:
```bash
python backend/manage.py runserver
```

Start the frontend Vite server:
```bash
cd frontend
npm run dev
```

Your app is now connected to a persistent, secure, and cloud-hosted Postgres database that is completely free of charge!
