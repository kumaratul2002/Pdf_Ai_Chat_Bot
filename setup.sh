echo "Setting up PDF Chat Bot..."
echo "Installing root dependencies..."
npm install
echo "Installing backend dependencies..."
cd backend && npm install
echo "Installing frontend dependencies..."
cd ../frontend && npm install
cd ..
echo "Creating environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "Created backend/.env - Please add your GEMINI_API_KEY"
else
    echo "backend/.env already exists"
fi

if [ ! -f frontend/.env ]; then
    echo "REACT_APP_API_URL=http://localhost:5000" > frontend/.env
    echo "Created frontend/.env"
else
    echo "frontend/.env already exists"
fi

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your Gemini API key to backend/.env"
echo "2. Start QdrantDB: docker-compose up -d"
echo "3. Run the application: npm run dev"
