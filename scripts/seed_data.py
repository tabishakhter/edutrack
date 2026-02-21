import asyncio
import sys
sys.path.append('/app/backend')
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from datetime import datetime, timezone

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Create admin user
    existing_admin = await db.users.find_one({"email": "admin@school.com"})
    if not existing_admin:
        admin_user = {
            "email": "admin@school.com",
            "password": pwd_context.hash("admin123"),
            "name": "School Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        print("✓ Admin user created (admin@school.com / admin123)")
    
    # Create sample classes
    classes_data = [
        {"id": "class_1", "name": "Class 1", "sections": ["A", "B"]},
        {"id": "class_2", "name": "Class 2", "sections": ["A", "B"]},
        {"id": "class_3", "name": "Class 3", "sections": ["A", "B", "C"]},
    ]
    
    for cls in classes_data:
        existing = await db.classes.find_one({"id": cls["id"]})
        if not existing:
            await db.classes.insert_one(cls)
    print("✓ Sample classes created")
    
    client.close()
    print("\n✅ Database seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())
