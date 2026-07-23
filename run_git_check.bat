@echo off
cd /d D:\Work\XueHanyu
echo === Git reflog ===
git reflog --oneline -10
echo.
echo === Git status ===
git status
echo.
echo === Recent diffs ===
git diff HEAD~1 --stat
pause
