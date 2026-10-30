#!/bin/sh
set -e

cd /var/www/html

if [ ! -f ".env" ]; then
  cp .env.example .env
fi

# Sync container environment variables into .env so php artisan serve workers always read them
for VAR_NAME in APP_ENV APP_KEY APP_DEBUG APP_URL FRONTEND_URL CORS_ALLOWED_ORIGINS AI_DEFAULT_PROVIDER NEBIUS_BASE_URL NEBIUS_API_KEY NEBIUS_DEFAULT_MODEL NEBIUS_FAST_MODEL TAVILY_BASE_URL TAVILY_API_KEY TAVILY_CACHE_TTL_HOURS WHOP_WEBHOOK_SECRET JUDGE_ACCESS_CODE JUDGE_MAGIC_TOKEN; do
  eval VAR_VAL=\$$VAR_NAME
  if [ -n "$VAR_VAL" ]; then
    if grep -q "^${VAR_NAME}=" .env 2>/dev/null; then
      sed -i "s|^${VAR_NAME}=.*|${VAR_NAME}=${VAR_VAL}|" .env
    else
      echo "${VAR_NAME}=${VAR_VAL}" >> .env
    fi
  fi
done

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
