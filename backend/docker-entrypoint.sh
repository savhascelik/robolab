#!/bin/sh
set -e

cd /var/www/html

if [ ! -f ".env" ]; then
  cp .env.example .env
fi

mkdir -p database storage/database storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
rm -f bootstrap/cache/*.php

if [ ! -f "storage/database/database.sqlite" ]; then
  touch storage/database/database.sqlite
fi

rm -f database/database.sqlite
ln -s /var/www/html/storage/database/database.sqlite database/database.sqlite

php artisan package:discover --ansi || true
if [ -z "$APP_KEY" ] && ! grep -q "^APP_KEY=base64:" .env 2>/dev/null; then
  php artisan key:generate --force --no-interaction || true
fi
php artisan filament:assets --no-interaction || true
php artisan migrate --seed --force --no-interaction

exec php artisan serve --host=0.0.0.0 --port=8000
