@echo off
title OG Fitness - Live Member Punch Tunnel
echo =======================================================
echo   OG FITNESS - CREATING LIVE MOBILE SHARING LINK
echo =======================================================
echo.
echo Connecting to secure tunnel for port 3000...
echo Keep this window open while members are scanning the QR!
echo.
ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:3000 serveo.net
pause
