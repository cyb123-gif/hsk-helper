#!/usr/bin/env bash
# ============================================================
# 学汉语 · 云服务器一键部署脚本（Ubuntu 20.04 / 22.04）
# 用法: sudo bash setup-server.sh 你的域名
# 示例: sudo bash setup-server.sh xuehanyu.site
# ============================================================
set -e

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
    echo "请传入域名，例如: sudo bash setup-server.sh xuehanyu.site"
    exit 1
fi

echo "===== 1/6 安装 Node.js ====="
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get update
    sudo apt-get install -y nodejs
fi
node -v

echo "===== 2/6 安装 git / nginx / certbot ====="
sudo apt-get install -y git nginx certbot python3-certbot-nginx

echo "===== 3/6 下载代码 ====="
if [ ! -d /opt/hsk-helper ]; then
    sudo git clone https://github.com/cyb123-gif/hsk-helper.git /opt/hsk-helper
fi
cd /opt/hsk-helper
sudo git pull origin master

echo "===== 4/6 填写密钥（只需要这一次，存在服务器上） ====="
printf "请粘贴 DeepSeek API Key 后回车: "
read -r DEEPSEEK_KEY
printf '%s\n' "$DEEPSEEK_KEY" | sudo tee api-key.txt > /dev/null

printf "请粘贴腾讯云三项密钥（一行：SecretId,SecretKey,AppID）后回车: "
read -r TENCENT_KEYS_LINE
printf '%s\n' "$TENCENT_KEYS_LINE" | sudo tee tencent-keys.txt > /dev/null

echo "===== 5/6 用 pm2 启动服务（开机自启） ====="
sudo npm install -g pm2
sudo pm2 delete hsk 2>/dev/null || true
sudo pm2 start server.js --name hsk
sudo pm2 save
sudo pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo "===== 6/6 配置 Nginx 反向代理 + 免费 HTTPS 证书 ====="
sudo tee /etc/nginx/sites-available/hsk > /dev/null <<EOF
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
sudo sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" /etc/nginx/sites-available/hsk
sudo ln -sf /etc/nginx/sites-available/hsk /etc/nginx/sites-enabled/hsk
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo ">> 申请 HTTPS 证书（域名必须已解析到本服务器 IP）"
sudo certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email || {
    echo "HTTPS 证书申请失败：请确认域名 ${DOMAIN} 的 A 记录已指向本服务器公网 IP，再手动运行:"
    echo "  sudo certbot --nginx -d ${DOMAIN}"
}

echo ""
echo "============================================================"
echo "  ✅ 部署完成！学生访问: https://${DOMAIN}"
echo "  如果证书没成功，先访问: http://${DOMAIN}"
echo "============================================================"
