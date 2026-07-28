@echo off
title Dropship Agent
cd /d "C:\Users\hamza\dropship-v2"

echo Starting Dropship Agent...
start "" "http://localhost:3100/dashboard"
npm run dev
