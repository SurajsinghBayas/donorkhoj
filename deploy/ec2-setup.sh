#!/usr/bin/env bash
# DonorKhoj EC2 setup — Ubuntu 22.04/24.04, run as a sudo-capable user.
# Usage:
#   1. Point your domain (e.g. api.donorkhoj.in) at this instance's Elastic IP.
#   2. Copy this repo to /opt/donorkhoj (git clone ...) and create backend/.env
#      from backend/.env.example with REAL secrets.
#   3. sudo bash deploy/ec2-setup.sh
set -euo pipefail

APP_DIR=/opt/donorkhoj
APP_USER=${SUDO_USER:-ubuntu}

echo "==> Installing system packages (Python 3.11, nginx, certbot)"
sudo apt-get update
sudo apt-get install -y python3.11 python3.11-venv python3-pip nginx certbot python3-certbot-nginx curl

echo "==> Creating log directory"
sudo mkdir -p /var/log/donorkhoj
sudo chown "$APP_USER":"$APP_USER" /var/log/donorkhoj

echo "==> Creating Python venv + installing backend deps"
cd "$APP_DIR/backend"
if [ ! -d venv ]; then
  python3.11 -m venv venv
fi
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt

echo "==> Sanity-checking production boot (fails fast on bad SECRET_KEY)"
ENV=production PORT=8001 venv/bin/python -c "import main; print('prod import OK')"

echo "==> Installing systemd service"
sudo cp "$APP_DIR/deploy/donorkhoj.service" /etc/systemd/system/donorkhoj.service
sudo systemctl daemon-reload
sudo systemctl enable --now donorkhoj
sleep 6
curl -fsS http://127.0.0.1:8000/health && echo && echo "==> Backend is up"

echo "==> Installing nginx site (edit server_name first!)"
echo "    sudo cp $APP_DIR/deploy/nginx-donorkhoj.conf /etc/nginx/sites-available/donorkhoj"
echo "    sudo ln -sf /etc/nginx/sites-available/donorkhoj /etc/nginx/sites-enabled/donorkhoj"
echo "    sudo nginx -t && sudo systemctl reload nginx"
echo
echo "==> Issue TLS certificate (after DNS propagates):"
echo "    sudo certbot --nginx -d api.donorkhoj.in"
echo
echo "Done. Next: deploy the frontend on Vercel with VITE_API_URL=https://api.donorkhoj.in"
echo "and set backend FRONTEND_URL=https://<your-app>.vercel.app, then: sudo systemctl restart donorkhoj"
