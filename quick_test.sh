#!/bin/bash
echo "=== HelpX Quick Verification ==="
echo ""

echo "1. Checking backend..."
if curl -s http://127.0.0.1:8000/ > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running. Start with: cd backend && uvicorn app.main:app --reload"
fi

echo ""
echo "2. Checking frontend..."
if curl -s http://localhost:5173/ > /dev/null; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend is not running. Start with: cd frontend && npm run dev"
fi

echo ""
echo "3. Checking database..."
if docker ps | grep -q helpx-mvp-db; then
    echo "✅ Database container is running"
else
    echo "❌ Database container is not running. Start with: docker compose up -d db"
fi

echo ""
echo "4. Checking admin user..."
if docker exec -it helpx-mvp-db-1 psql -U helpx -d helpxdb -t -c "SELECT COUNT(*) FROM users WHERE role = 'admin';" 2>/dev/null | grep -q "1"; then
    echo "✅ Admin user exists"
else
    echo "⚠️  Admin user may not exist. Run: cd backend && python seed_admin.py"
fi

echo ""
echo "=== Quick Test Complete ==="
