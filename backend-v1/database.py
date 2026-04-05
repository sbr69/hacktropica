"""
MongoDB Async Database Client
Connection lifecycle, index management, health checks.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class Database:
    """Async MongoDB manager with connection pooling and index creation."""

    def __init__(self, url: str, db_name: str):
        self._url = url
        self._db_name = db_name
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None

    async def connect(self) -> None:
        """Connect to MongoDB and verify the connection."""
        try:
            self.client = AsyncIOMotorClient(
                self._url,
                maxPoolSize=20,
                minPoolSize=2,
                serverSelectionTimeoutMS=30000,  # 30 seconds
                connectTimeoutMS=30000,
            )
            # Verify connection
            await self.client.admin.command("ping")
            self.db = self.client[self._db_name]
            await self._create_indexes()
            logger.info("✅ Connected to MongoDB: %s", self._db_name)
        except Exception as e:
            logger.error("❌ MongoDB connection failed: %s", e)
            logger.error("💡 Troubleshooting tips:")
            logger.error("   1. Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for testing)")
            logger.error("   2. Verify cluster is active (not paused)")
            logger.error("   3. Check network/firewall allows port 27017")
            logger.error("   4. Verify credentials in MONGODB_URL")
            raise

    async def disconnect(self) -> None:
        """Gracefully close the MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

    async def is_healthy(self) -> bool:
        """Quick health check."""
        if not self.client:
            return False
        try:
            await self.client.admin.command("ping")
            return True
        except Exception:
            return False

    async def _create_indexes(self) -> None:
        """Create indexes for common query patterns."""
        assert self.db is not None

        # ── Auth Collections (lean — email, password_hash, role) ──────
        # Dashboard auth (admin, hod, faculty)
        await self.db.dashboard_auth.create_index("email", unique=True)
        await self.db.dashboard_auth.create_index("role")

        # Student auth (students only)
        await self.db.student_auth.create_index("email", unique=True)

        # ── Profile Collections (metadata — no passwords) ────────────
        # Dashboard profiles
        await self.db.dashboard_profiles.create_index("email", unique=True)

        # Student profiles
        await self.db.student_profiles.create_index("email", unique=True)
        await self.db.student_profiles.create_index([("stream", 1), ("sem", 1)])

        # ── Other Collections ─────────────────────────────────────────
        # Sessions (30-day TTL)
        await self.db.sessions.create_index([("uid", 1), ("updated_at", -1)])
        await self.db.sessions.create_index("updated_at", expireAfterSeconds=2592000)

        # Documents
        await self.db.documents.create_index("created_at")
        await self.db.documents.create_index("uploaded_by")

        # Quiz results
        await self.db.quiz_results.create_index([("uid", 1), ("submitted_at", -1)])

        # Audit logs
        await self.db.audit_logs.create_index("timestamp")
        await self.db.audit_logs.create_index("action")
        await self.db.audit_logs.create_index("user_id")

        # Daily queries (date-wise hit counts)
        await self.db.daily_queries.create_index("date", unique=True)

        # Per-user query stats (for analytics)
        await self.db.query_stats.create_index("total_queries")

        # Stream-level hit counts (global per-stream, not per-student)
        await self.db.stream_hit_counts.create_index("total_queries")

        # Curriculum
        await self.db.curriculum.create_index(
            [("stream", 1), ("semester", 1)], unique=True
        )

        logger.info("✅ Database indexes ensured")
