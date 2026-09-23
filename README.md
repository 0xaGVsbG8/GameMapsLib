# Interact Maps
THE APP RUNS ON PORT 8322

Interactive maps for games. Admins place markers on uploaded map images, group them into categories, and publish a game so visitors can pan, zoom map and filter locations. The public site only shows games marked as public.

The stack is **Next.js** (UI), **Django REST Framework** (API + auth), **SQLite** (data), and **nginx** (one public port when using Docker).

## What you can do

- Create games tab, upload map images, and optionally enable in-game coordinate settings (origin + pixels per unit) feature.
- Organize markers: category → subcategory → item, with optional icons displayed on map.
- Place, move, and edit markers on the map (click to add, right-click to edit).
- Pan, mouse-wheel zoom, and pinch-zoom on touch devices like phones.
- Filter categories/subcategories on the public map (unchecked items are dimmed).
- Publish or hide a game. `/GameMapsLib/home` never lists private games.

## Architecture

```
Browser  →  nginx :8322
              ├─ /GameMapsLib/blog/*   → Django :8000 /blog/
              ├─ /GameMapsLib/media/*  → django-backend/media
              ├─ /GameMapsLib/*        → Next.js :3000
              └─ /                       → 301 /GameMapsLib/
```

Django and Next are not published on the host. Only nginx is, meaning when the app is launched by docker it only takes up a single port instead of for every service.

`DATA_DIR` is where Django stores the database and uploads:

| How you run        | `DATA_DIR`                         | Database                         | Media                            |
|--------------------|------------------------------------|----------------------------------|----------------------------------|
| Docker Compose     | `/data` (bind-mounted repo folder) | `django-backend/db.sqlite3`      | `django-backend/media/`          |
| Local `runserver`  | `django-backend/` (default)        | `django-backend/db.sqlite3`      | `django-backend/media/`          |

Compose mounts `./django-backend` at `/data`, so Docker and a local run share the same DB and files.

## Project layout

```
interact_maps/
├── docker-compose.yml
├── nginx/nginx.conf
├── django-backend/          API, auth, SQLite, media
│   ├── blog/models.py
│   ├── blog/api/views/      one module per endpoint
│   ├── blog/api/helpers.py  media paths, icons, map images
│   ├── media/<Game name>/   icons/ and maps/
│   └── entrypoint.py        migrate, then gunicorn
└── next_frontend/           App Router UI
    └── src/app/
        ├── home/            public maps (read-only)
        └── admin/
            ├── login/
            ├── dashboard/   editor (comps + css)
            └── api.ts       API base URL helper
```

## Data model

```
Games (id PK, unique name, public)
  └── GameMaps          map image + size + optional coordinates
  └── ItemsCategories   unique (name, game)
        └── ItemsSubCategories   unique (name, game, category), optional default icon
              └── Items          x/y on the map, optional icon
```

Foreign keys use the game **id**. The API still identifies a game by **name** (`GameName` query/body field). Renaming a game only updates the `name` field; related rows stay attached.

### Media on disk

Uploads for a game live in one folder named after the game:

```
django-backend/media/
  Elden ring/
    icons/   marker and subcategory icons
    maps/    map images
  Palworld - Palpagos/
    icons/
    maps/
```

The browser loads them as `/media/<Game name>/icons/...` and `/media/<Game name>/maps/...`.

## Pages

| URL | Who | Behavior |
|-----|-----|----------|
| `/` | everyone | Redirects to `/GameMapsLib/` |
| `/GameMapsLib/home` | everyone | Public map explorer (no login). Only public games. |
| `/GameMapsLib/admin/login` | staff | Username/password. Sets httpOnly JWT cookies. |
| `/GameMapsLib/admin/dashboard` | staff | Full editor: games, maps, categories, markers. |

`MapExplorer` is shared. On `/GameMapsLib/home` it is `readOnly`: public list/info endpoints, no create/edit UI, and private games are not requested.

Local `npm run dev` (port 3000) has no prefix: `/home`, `/admin/...`, and Django on `:8000/blog`.

## API (`/blog/...`)

Through nginx the browser calls `/GameMapsLib/blog/...`; nginx strips the prefix so Django still sees `/blog/...`. Cookie JWT (`access_token`) is required except where noted. Login must be a Django **staff** user.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/blog/auth-user` | no | Login; sets `access_token` / `refresh_token` |
| GET | `/blog/isUserAuthed` | yes | Session check |
| GET | `/blog/getGlobalInfo` | yes | All game names + overview counts |
| GET | `/blog/getGameInfo?GameName=` | yes | Full game: maps, categories, items |
| GET | `/blog/getPublicGames` | no | Public game names only |
| GET | `/blog/getPublicGameInfo?GameName=` | no | Same shape as getGameInfo, public games only |
| POST/PATCH/DELETE | `/blog/ManageGames` | yes | Create, rename / set `public`, delete |
| POST | `/blog/addMap` | yes | Upload or update a map image |
| POST/PATCH/DELETE | `/blog/ManageCategories` | yes | Categories |
| POST/PATCH/DELETE | `/blog/ManageSubCategories` | yes | Subcategories (icon on create or edit) |
| POST/PATCH/DELETE | `/blog/ManageItems` | yes | Markers (position, icon) |

Write endpoints validate with DRF serializers in the same view files.

## Run with Docker

Needs Docker Desktop (or Engine + Compose). From the repo root:

```bash
docker compose up --build
```

Open [http://localhost:8322] (port **8322**).

On start, Django migrates SQLite and gunicorn listens on 8000 inside the network. Next is built as a standalone Node app on 3000. Nginx is the only process bound to the host.

To create an admin user against the same database:

```bash
docker compose exec django python manage.py createsuperuser
```

The user must be staff (superuser is).

## Run without Docker

Two terminals.

**API** (`django-backend`):

```bash
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

`runserver` also serves `/media/` from `django-backend/media`.

**UI** (`next_frontend`):

```bash
npm install
npm run dev
```

Open [http://localhost:3000]. The UI talks to Django on port **8000** when the page itself is on 3000. Behind nginx (port 80) it uses same-origin `/blog` and `/media`.

Python 3.13 and Node 22 match the Docker images.

## Frontend notes

- Dashboard components live in `next_frontend/src/app/admin/dashboard/comps/`, styles in `css/`.
- `apiUrl()` in `admin/api.ts` picks Django `:8000` during Next dev, and same-origin paths in Docker/nginx.
- Map zoom: wheel toward cursor; two-finger pinch on touch (`touch-action: none` on the stage).

## Environment

| Variable | Where | Meaning |
|----------|--------|---------|
| `DATA_DIR` | Django | Root for `db.sqlite3` and `media/`. Unset locally; `/data` in Compose. |
| `ALLOWED_HOSTS` | Django | Host header allow list (`*` in Compose). |
| `INTERNAL_API_URL` | Next (server) | Django URL for SSR. Compose sets `http://django:8000`. |
| `NEXT_PUBLIC_API_BASE` | Next (optional) | Override API origin in the browser. |
