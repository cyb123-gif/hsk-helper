@echo off
cd /d D:\Work\XueHanyu
echo === Parse HSK3 v4 (fixed: keep superscripts, fix format) ===
node parse_hsk3_v4.js
echo.
echo === Integrate into index.html ===
node integrate_hsk3.js
echo.
echo === Done! Open index.html to verify. ===
pause
