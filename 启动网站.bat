@echo off
chcp 65001 >nul
title 汉语学习助手 - 本地服务器
cd /d %~dp0
echo.
echo   ============================================
echo    正在启动汉语学习助手本地服务器...
echo    浏览器将自动打开 http://localhost:3001
echo    数字人、语音等功能都从这里打开使用。
echo    关闭本窗口 = 关闭网站服务。
echo   ============================================
echo.
start "" http://localhost:3001
node server.js
pause
