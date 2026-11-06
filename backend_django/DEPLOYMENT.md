# MultiSchool Pro — Production Deployment & Handover Guide

This guide details how to deploy MultiSchool Pro in production using PostgreSQL, Gunicorn, Nginx, and systemd.

---

## 1. Environment Architecture

- **Web Frontend**: React 19 + TypeScript + Tailwind CSS (bundled to static `dist/` or served via CDN/Nginx).
- **Backend API**:
  - Live preview runs Express + Node.js with built-in SQLite engine on Port 3000.
  - Dedicated production Python/Django backend located in `backend_django/`.
- **Database**:
  - Development: SQLite with WAL journaling (`data/multischool.sqlite`).
  - Production: Managed PostgreSQL 15+ (e.g. AWS RDS, Google Cloud SQL, Supabase, Neon).

---

## 2. PostgreSQL Production Setup

### A. Database Provisioning
Run as PostgreSQL superuser (`postgres`):

```sql
CREATE DATABASE multischool_prod;
CREATE USER multischool_user WITH ENCRYPTED PASSWORD 'YourSecureProductionPassword123!';
GRANT ALL PRIVILEGES ON DATABASE multischool_prod TO multischool_user;
ALTER DATABASE multischool_prod SET timezone TO 'UTC';
```

### B. Environment Variables (`.env`)
Create a `.env` file in `backend_django/`:

```env
SECRET_KEY=generate-a-64-character-random-hex-key
DEBUG=False
ALLOWED_HOSTS=api.yourmultischool.com,app.yourmultischool.com
DATABASE_URL=postgres://multischool_user:YourSecureProductionPassword123!@localhost:5432/multischool_prod
CORS_ALLOWED_ORIGINS=https://app.yourmultischool.com
```

---

## 3. Django Migration and Superuser Setup

```bash
cd backend_django
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations core
python manage.py migrate

# Create initial Platform Super Administrator
python manage.py createsuperuser --email superadmin@multischool.pro --full_name "Platform Super Administrator"
```

---

## 4. Gunicorn & Systemd Service

Create `/etc/systemd/system/multischool.service`:

```ini
[Unit]
Description=MultiSchool Pro Django Application Server
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/multischool/backend_django
ExecStart=/var/www/multischool/backend_django/venv/bin/gunicorn \
          --workers 4 \
          --bind 127.0.0.1:8000 \
          --timeout 90 \
          multischool.wsgi:application

[Install]
WantedBy=multi-user.target
```

Reload and start:
```bash
sudo systemctl daemon-reload
sudo systemctl start multischool
sudo systemctl enable multischool
```

---

## 5. Nginx Reverse Proxy Configuration

```nginx
server {
    listen 80;
    server_name api.yourmultischool.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/multischool/backend_django/staticfiles/;
    }

    location /media/ {
        alias /var/www/multischool/backend_django/media/;
    }
}
```

---

## 6. Automated Backup & Recovery

Daily automated backup script:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/multischool"
DATE=$(date +%Y-%m-%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U multischool_user -h localhost multischool_prod | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"
# Retain backups for 30 days
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -delete
```
