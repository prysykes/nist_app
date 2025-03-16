#!/bin/sh

set -e # exit the script if an error occurs

python manage.py collectstatic --noinput
python manage.py makemigrations
python manage.py migrate --noinput


gunicorn nist_app.wsgi:application --bind 0.0.0.0:8000 --workers 3 
