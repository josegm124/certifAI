#!/bin/bash

# CertifAI Local Deployment Script (Mac/Linux)
# Run this script to install dependencies and start both frontend and backend

set -e  # Exit on any error

echo "🚀 CertifAI Local Deployment"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -f "CertifAI_MVP.jsx" ]; then
    echo -e "${RED}❌ Error: Must run this script from the project root directory${NC}"
    echo "   Expected to find: ./backend/ and ./CertifAI_MVP.jsx"
    exit 1
fi

# Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
    exit 1
fi
echo ""

# Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd backend
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install backend dependencies${NC}"
    exit 1
fi
cd ..
echo ""

# Create .env if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo -e "${BLUE}📝 Creating backend/.env file...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✅ .env file created from .env.example${NC}"
    echo ""
fi

# Start both servers
echo -e "${BLUE}🎯 Starting servers...${NC}"
echo -e "${GREEN}Frontend will run on: http://localhost:5173${NC}"
echo -e "${GREEN}Backend will run on: http://localhost:3001${NC}"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop both servers${NC}"
echo ""

# Start backend in background
echo -e "${BLUE}Starting backend...${NC}"
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Start frontend in background
echo -e "${BLUE}Starting frontend...${NC}"
npm run dev &
FRONTEND_PID=$!

# Wait a moment for servers to start
sleep 3
echo ""
echo -e "${GREEN}✅ Both servers are starting!${NC}"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo -e "${BLUE}Opening browser...${NC}"

# Try to open in default browser (Mac)
if command -v open &> /dev/null; then
    sleep 2
    open http://localhost:5173
fi

# Keep the script running
wait
