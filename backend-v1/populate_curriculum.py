"""
Script to populate curriculum data for CSE, ECE, and ME streams
with 8 semesters each and 3-4 subjects per semester.
"""
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from config import Settings

# Initialize settings
settings = Settings()

# Curriculum data for all streams
CURRICULUM_DATA = {
    "cse": {
        "1": [
            {"name": "Engineering Mathematics I", "code": "MA101"},
            {"name": "Engineering Physics", "code": "PH101"},
            {"name": "Engineering Chemistry", "code": "CH101"},
            {"name": "Basic Electrical Engineering", "code": "EE101"},
        ],
        "2": [
            {"name": "Engineering Mathematics II", "code": "MA102"},
            {"name": "Data Structures", "code": "CS201"},
            {"name": "Digital Electronics", "code": "EC201"},
            {"name": "Engineering Mechanics", "code": "ME201"},
        ],
        "3": [
            {"name": "Discrete Mathematics", "code": "MA201"},
            {"name": "Object Oriented Programming", "code": "CS301"},
            {"name": "Computer Organization", "code": "CS302"},
            {"name": "Database Management Systems", "code": "CS303"},
        ],
        "4": [
            {"name": "Algorithms", "code": "CS401"},
            {"name": "Operating Systems", "code": "CS402"},
            {"name": "Computer Networks", "code": "CS403"},
            {"name": "Software Engineering", "code": "CS404"},
        ],
        "5": [
            {"name": "Theory of Computation", "code": "CS501"},
            {"name": "Compiler Design", "code": "CS502"},
            {"name": "Machine Learning", "code": "CS503"},
            {"name": "Web Technologies", "code": "CS504"},
        ],
        "6": [
            {"name": "Artificial Intelligence", "code": "CS601"},
            {"name": "Cloud Computing", "code": "CS602"},
            {"name": "Information Security", "code": "CS603"},
        ],
        "7": [
            {"name": "Big Data Analytics", "code": "CS701"},
            {"name": "Mobile Application Development", "code": "CS702"},
            {"name": "Blockchain Technology", "code": "CS703"},
            {"name": "Internet of Things", "code": "CS704"},
        ],
        "8": [
            {"name": "Deep Learning", "code": "CS801"},
            {"name": "Natural Language Processing", "code": "CS802"},
            {"name": "Computer Vision", "code": "CS803"},
        ],
    },
    "ece": {
        "1": [
            {"name": "Engineering Mathematics I", "code": "MA101"},
            {"name": "Engineering Physics", "code": "PH101"},
            {"name": "Engineering Chemistry", "code": "CH101"},
            {"name": "Basic Electrical Engineering", "code": "EE101"},
        ],
        "2": [
            {"name": "Engineering Mathematics II", "code": "MA102"},
            {"name": "Circuit Theory", "code": "EC201"},
            {"name": "Electronic Devices", "code": "EC202"},
            {"name": "Signals and Systems", "code": "EC203"},
        ],
        "3": [
            {"name": "Analog Electronics", "code": "EC301"},
            {"name": "Digital Electronics", "code": "EC302"},
            {"name": "Network Analysis", "code": "EC303"},
            {"name": "Electromagnetic Theory", "code": "EC304"},
        ],
        "4": [
            {"name": "Microprocessors and Microcontrollers", "code": "EC401"},
            {"name": "Communication Systems", "code": "EC402"},
            {"name": "Control Systems", "code": "EC403"},
            {"name": "Digital Signal Processing", "code": "EC404"},
        ],
        "5": [
            {"name": "VLSI Design", "code": "EC501"},
            {"name": "Wireless Communication", "code": "EC502"},
            {"name": "Embedded Systems", "code": "EC503"},
        ],
        "6": [
            {"name": "Optical Communication", "code": "EC601"},
            {"name": "Antenna and Wave Propagation", "code": "EC602"},
            {"name": "Digital Communication", "code": "EC603"},
            {"name": "Microwave Engineering", "code": "EC604"},
        ],
        "7": [
            {"name": "Satellite Communication", "code": "EC701"},
            {"name": "Mobile Communication", "code": "EC702"},
            {"name": "IoT and Sensor Networks", "code": "EC703"},
            {"name": "Radar Systems", "code": "EC704"},
        ],
        "8": [
            {"name": "5G Networks", "code": "EC801"},
            {"name": "Machine Learning for Signal Processing", "code": "EC802"},
            {"name": "Advanced VLSI Design", "code": "EC803"},
        ],
    },
    "me": {
        "1": [
            {"name": "Engineering Mathematics I", "code": "MA101"},
            {"name": "Engineering Physics", "code": "PH101"},
            {"name": "Engineering Chemistry", "code": "CH101"},
            {"name": "Engineering Graphics", "code": "ME101"},
        ],
        "2": [
            {"name": "Engineering Mathematics II", "code": "MA102"},
            {"name": "Engineering Mechanics", "code": "ME201"},
            {"name": "Thermodynamics", "code": "ME202"},
            {"name": "Manufacturing Processes", "code": "ME203"},
        ],
        "3": [
            {"name": "Strength of Materials", "code": "ME301"},
            {"name": "Fluid Mechanics", "code": "ME302"},
            {"name": "Material Science", "code": "ME303"},
            {"name": "Theory of Machines", "code": "ME304"},
        ],
        "4": [
            {"name": "Heat Transfer", "code": "ME401"},
            {"name": "Machine Design", "code": "ME402"},
            {"name": "Manufacturing Technology", "code": "ME403"},
            {"name": "Dynamics of Machinery", "code": "ME404"},
        ],
        "5": [
            {"name": "Automobile Engineering", "code": "ME501"},
            {"name": "Refrigeration and Air Conditioning", "code": "ME502"},
            {"name": "Industrial Engineering", "code": "ME503"},
        ],
        "6": [
            {"name": "CAD/CAM", "code": "ME601"},
            {"name": "Finite Element Analysis", "code": "ME602"},
            {"name": "Mechatronics", "code": "ME603"},
            {"name": "Power Plant Engineering", "code": "ME604"},
        ],
        "7": [
            {"name": "Robotics", "code": "ME701"},
            {"name": "Additive Manufacturing", "code": "ME702"},
            {"name": "Renewable Energy Systems", "code": "ME703"},
            {"name": "Advanced Manufacturing", "code": "ME704"},
        ],
        "8": [
            {"name": "Computational Fluid Dynamics", "code": "ME801"},
            {"name": "Smart Materials", "code": "ME802"},
            {"name": "Sustainable Engineering", "code": "ME803"},
        ],
    },
}


async def populate_curriculum():
    """Populate curriculum data into MongoDB."""
    print("🚀 Starting curriculum population...")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_db_name]
    
    try:
        # Verify connection
        await client.admin.command("ping")
        print("✅ Connected to MongoDB")
        
        total_inserted = 0
        
        # Iterate through all streams
        for stream, semesters in CURRICULUM_DATA.items():
            print(f"\n📚 Processing stream: {stream.upper()}")
            
            # Iterate through all semesters
            for semester, subjects in semesters.items():
                result = await db.curriculum.update_one(
                    {"stream": stream, "semester": semester},
                    {
                        "$set": {
                            "subjects": subjects,
                            "updated_at": datetime.utcnow(),
                            "updated_by": "system",
                        }
                    },
                    upsert=True,
                )
                
                if result.upserted_id or result.modified_count > 0:
                    total_inserted += 1
                    print(f"  ✓ Semester {semester}: {len(subjects)} subjects")
        
        print(f"\n🎉 Successfully populated {total_inserted} curriculum entries!")
        print(f"   - Streams: CSE, ECE, ME")
        print(f"   - Semesters: 1-8 for each stream")
        print(f"   - Total subjects: {sum(len(subjects) for stream_data in CURRICULUM_DATA.values() for subjects in stream_data.values())}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise
    finally:
        client.close()
        print("\n🔌 MongoDB connection closed")


if __name__ == "__main__":
    asyncio.run(populate_curriculum())
