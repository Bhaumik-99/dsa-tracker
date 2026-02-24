from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware  # <--- THIS WAS MISSING
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from zoneinfo import ZoneInfo

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'dsa-tracker-secret-key-change-in-prod')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

security = HTTPBearer()

# Create the main app
app = FastAPI(title="DSA Revision Tracker API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# DSA Patterns
DSA_PATTERNS = [
    "Two Pointers", "Fast & Slow Pointers", "Sliding Window", "Kadane Pattern",
    "Prefix Sum", "Merge Intervals", "Cyclic Sort", "In-place Reversal of LinkedList",
    "Stack", "Hash Maps", "Binary Search", "Heap (Priority Queue)",
    "Graph Traversal (BFS)", "Island / Matrix Traversal", "Subsets", "Bitwise XOR",
    "Greedy Algorithms", "0/1 Knapsack (Dynamic Programming)", "Backtracking",
    "Trie", "Topological Sort", "Union Find (Disjoint Set)", "Ordered Set"
]

# Revision intervals in days
REVISION_INTERVALS = [1, 3, 7, 14, 30]

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    created_at: str
    streak: int = 0
    last_revision_date: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProblemCreate(BaseModel):
    title: str = Field(min_length=1)
    link: str = Field(min_length=1)
    pattern: str
    difficulty: str = Field(pattern="^(Easy|Medium|Hard)$")
    notes: Optional[str] = ""

class RevisionDates(BaseModel):
    day1: str
    day3: str
    day7: str
    day14: str
    day30: str

class ProblemResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    link: str
    pattern: str
    difficulty: str
    notes: str
    solved_date: str
    revision_dates: RevisionDates
    completed_revisions: List[str]
    status: str
    created_at: str
    is_leetcode: bool = False

# UPDATED: Added completed_at and timezone_str
class RevisionUpdate(BaseModel):
    revision_stage: str = Field(pattern="^(day1|day3|day7|day14|day30)$")
    completed_at: Optional[str] = None
    timezone_str: Optional[str] = "UTC"

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "streak": 0,
        "last_revision_date": None
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    user_response = UserResponse(
        id=user_id,
        email=data.email,
        name=data.name,
        created_at=user_doc["created_at"],
        streak=0,
        last_revision_date=None
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        created_at=user["created_at"],
        streak=user.get("streak", 0),
        last_revision_date=user.get("last_revision_date")
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=current_user["created_at"],
        streak=current_user.get("streak", 0),
        last_revision_date=current_user.get("last_revision_date")
    )

# ==================== PROBLEM ROUTES ====================

def generate_revision_dates(solved_date: datetime) -> dict:
    return {
        "day1": (solved_date + timedelta(days=1)).isoformat(),
        "day3": (solved_date + timedelta(days=3)).isoformat(),
        "day7": (solved_date + timedelta(days=7)).isoformat(),
        "day14": (solved_date + timedelta(days=14)).isoformat(),
        "day30": (solved_date + timedelta(days=30)).isoformat()
    }

def is_leetcode_link(link: str) -> bool:
    return "leetcode.com" in link.lower()

@api_router.post("/problems", response_model=ProblemResponse)
async def create_problem(data: ProblemCreate, current_user: dict = Depends(get_current_user)):
    if data.pattern not in DSA_PATTERNS:
        raise HTTPException(status_code=400, detail=f"Invalid pattern. Must be one of: {DSA_PATTERNS}")
    
    problem_id = str(uuid.uuid4())
    solved_date = datetime.now(timezone.utc)
    revision_dates = generate_revision_dates(solved_date)
    
    problem_doc = {
        "id": problem_id,
        "user_id": current_user["id"],
        "title": data.title,
        "link": data.link,
        "pattern": data.pattern,
        "difficulty": data.difficulty,
        "notes": data.notes or "",
        "solved_date": solved_date.isoformat(),
        "revision_dates": revision_dates,
        "completed_revisions": [],
        "status": "learning",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_leetcode": is_leetcode_link(data.link)
    }
    
    await db.problems.insert_one(problem_doc)
    
    return ProblemResponse(
        id=problem_id,
        user_id=current_user["id"],
        title=data.title,
        link=data.link,
        pattern=data.pattern,
        difficulty=data.difficulty,
        notes=data.notes or "",
        solved_date=problem_doc["solved_date"],
        revision_dates=RevisionDates(**revision_dates),
        completed_revisions=[],
        status="learning",
        created_at=problem_doc["created_at"],
        is_leetcode=problem_doc["is_leetcode"]
    )

@api_router.get("/problems", response_model=List[ProblemResponse])
async def get_problems(
    pattern: Optional[str] = None,
    difficulty: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    
    if pattern:
        query["pattern"] = pattern
    if difficulty:
        query["difficulty"] = difficulty
    if status:
        query["status"] = status
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    
    problems = await db.problems.find(query, {"_id": 0}).to_list(1000)
    
    return [ProblemResponse(
        id=p["id"],
        user_id=p["user_id"],
        title=p["title"],
        link=p["link"],
        pattern=p["pattern"],
        difficulty=p["difficulty"],
        notes=p["notes"],
        solved_date=p["solved_date"],
        revision_dates=RevisionDates(**p["revision_dates"]),
        completed_revisions=p["completed_revisions"],
        status=p["status"],
        created_at=p["created_at"],
        is_leetcode=p.get("is_leetcode", False)
    ) for p in problems]

@api_router.get("/revisions/today", response_model=List[dict])
async def get_today_revisions(
    timezone_str: str = "UTC",
    current_user: dict = Depends(get_current_user)
):
    try:
        user_tz = ZoneInfo(timezone_str)
    except Exception:
        user_tz = ZoneInfo("UTC")
    
    now_user = datetime.now(user_tz)
    today_start = now_user.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    problems = await db.problems.find(
        {"user_id": current_user["id"], "status": "learning"},
        {"_id": 0}
    ).to_list(1000)
    
    due_today = []
    
    for p in problems:
        revision_dates = p["revision_dates"]
        completed = p["completed_revisions"]
        
        for stage in ["day1", "day3", "day7", "day14", "day30"]:
            if stage in completed:
                continue
            
            rev_date = datetime.fromisoformat(revision_dates[stage])
            if rev_date.tzinfo is None:
                rev_date = rev_date.replace(tzinfo=timezone.utc)
            
            rev_date_user = rev_date.astimezone(user_tz)
            
            # Check if due today or overdue
            if rev_date_user.date() <= today_end.date():
                is_overdue = rev_date_user.date() < today_start.date()
                due_today.append({
                    "id": p["id"],
                    "title": p["title"],
                    "link": p["link"],
                    "pattern": p["pattern"],
                    "difficulty": p["difficulty"],
                    "notes": p["notes"],
                    "revision_stage": stage,
                    "revision_date": revision_dates[stage],
                    "is_overdue": is_overdue,
                    "is_leetcode": p.get("is_leetcode", False)
                })
            break  # Only show the next pending revision for each problem
    
    # Sort by overdue first, then by revision stage
    stage_order = {"day1": 1, "day3": 2, "day7": 3, "day14": 4, "day30": 5}
    due_today.sort(key=lambda x: (not x["is_overdue"], stage_order.get(x["revision_stage"], 99)))
    
    return due_today

@api_router.patch("/revise/{problem_id}")
async def mark_revision_complete(
    problem_id: str,
    data: RevisionUpdate,
    current_user: dict = Depends(get_current_user)
):
    problem = await db.problems.find_one(
        {"id": problem_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    if data.revision_stage in problem["completed_revisions"]:
        raise HTTPException(status_code=400, detail="Revision already completed")
    
    # Parse the exact time the user completed it
    if data.completed_at:
        completed_time = datetime.fromisoformat(data.completed_at.replace('Z', '+00:00'))
    else:
        completed_time = datetime.now(timezone.utc)

    # UPDATED LOGIC: Calculate dynamic intervals for future dates based on completion time
    # This defines how many days to jump FORWARD from the newly completed stage.
    # Ex: If they just finished 'day3', the next date ('day7') should be 4 days from NOW.
    gaps_from_stage = {
        "day1": [("day3", 2), ("day7", 6), ("day14", 13), ("day30", 29)],
        "day3": [("day7", 4), ("day14", 11), ("day30", 27)],
        "day7": [("day14", 7), ("day30", 23)],
        "day14": [("day30", 16)],
        "day30": []
    }

    dynamic_updates = {}
    for next_stage, days_to_add in gaps_from_stage.get(data.revision_stage, []):
        new_date = (completed_time + timedelta(days=days_to_add)).isoformat()
        dynamic_updates[f"revision_dates.{next_stage}"] = new_date

    # Add to completed revisions
    completed = problem["completed_revisions"] + [data.revision_stage]
    
    # Check if mastered (all revisions complete)
    new_status = "mastered" if "day30" in completed else "learning"
    
    # Bundle updates
    update_doc = {
        "completed_revisions": completed,
        "status": new_status,
        **dynamic_updates
    }

    await db.problems.update_one(
        {"id": problem_id},
        {"$set": update_doc}
    )
    
    # Update user streak (using their timezone if available)
    try:
        user_tz = ZoneInfo(data.timezone_str) if data.timezone_str else ZoneInfo("UTC")
    except Exception:
        user_tz = ZoneInfo("UTC")
        
    today = datetime.now(user_tz).date().isoformat()
    last_rev_date = current_user.get("last_revision_date")
    yesterday = (datetime.now(user_tz).date() - timedelta(days=1)).isoformat()
    
    if last_rev_date == today:
        pass
    elif last_rev_date == yesterday:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$inc": {"streak": 1}, "$set": {"last_revision_date": today}}
        )
    else:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"streak": 1, "last_revision_date": today}}
        )
    
    return {"message": "Revision marked complete", "status": new_status}

@api_router.get("/analytics")
async def get_analytics(
    timezone_str: str = "UTC",  # Added timezone parameter
    current_user: dict = Depends(get_current_user)
):
    problems = await db.problems.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    total = len(problems)
    mastered = sum(1 for p in problems if p["status"] == "mastered")
    learning = total - mastered
    
    # Pattern distribution
    pattern_dist = {}
    for p in problems:
        pattern = p["pattern"]
        pattern_dist[pattern] = pattern_dist.get(pattern, 0) + 1
    
    # Difficulty distribution
    difficulty_dist = {"Easy": 0, "Medium": 0, "Hard": 0}
    for p in problems:
        difficulty_dist[p["difficulty"]] = difficulty_dist.get(p["difficulty"], 0) + 1
    
    # Get today's count - WITH TIMEZONE FIX
    try:
        user_tz = ZoneInfo(timezone_str)
    except Exception:
        user_tz = ZoneInfo("UTC")

    now_user = datetime.now(user_tz)
    today_start = now_user.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    due_today = 0
    for p in problems:
        if p["status"] == "mastered":
            continue
        revision_dates = p["revision_dates"]
        completed = p["completed_revisions"]
        
        for stage in ["day1", "day3", "day7", "day14", "day30"]:
            if stage in completed:
                continue
            rev_date = datetime.fromisoformat(revision_dates[stage])
            if rev_date.tzinfo is None:
                rev_date = rev_date.replace(tzinfo=timezone.utc)
            rev_date_user = rev_date.astimezone(user_tz)
            
            # Using same logic as revisions/today endpoint
            if rev_date_user.date() <= today_end.date():
                due_today += 1
            break
    
    # Get user streak
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    streak = user.get("streak", 0) if user else 0
    
    return {
        "total_problems": total,
        "mastered_count": mastered,
        "learning_count": learning,
        "due_today": due_today,
        "streak": streak,
        "pattern_distribution": [{"name": k, "count": v} for k, v in pattern_dist.items()],
        "difficulty_distribution": [{"name": k, "count": v} for k, v in difficulty_dist.items()]
    }

@api_router.get("/patterns")
async def get_patterns():
    return {"patterns": DSA_PATTERNS}


# ==================== PATTERN CHEAT SHEET ====================

class PatternCheatCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    notes: Optional[str] = ""
    tags: Optional[List[str]] = []

class PatternCheatUpdate(BaseModel):
    description: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class PatternCheatUpsert(BaseModel):
    name: str = Field(min_length=1)
    description: Optional[str] = ""
    notes: Optional[str] = ""
    tags: Optional[List[str]] = []


@api_router.get("/pattern-cheats")
async def get_pattern_cheats(current_user: dict = Depends(get_current_user)):
    """Returns merged list: DSA_PATTERNS (with user overrides) + user's custom patterns."""
    user_cheats = await db.pattern_cheats.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(500)
    
    by_name = {p["name"]: p for p in user_cheats}
    result = []
    
    # Built-in patterns first
    for name in DSA_PATTERNS:
        if name in by_name:
            result.append(by_name[name])
        else:
            result.append({
                "id": f"builtin-{name}",
                "user_id": current_user["id"],
                "name": name,
                "description": "",
                "notes": "",
                "tags": [],
                "is_builtin": True,
            })
    
    # User's custom patterns
    for p in user_cheats:
        if p["name"] not in DSA_PATTERNS:
            result.append({**p, "is_builtin": False})
    
    return result


@api_router.post("/pattern-cheats", response_model=dict)
async def create_pattern_cheat(
    data: PatternCheatCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a custom pattern (name must not be in DSA_PATTERNS)."""
    if data.name in DSA_PATTERNS:
        raise HTTPException(
            status_code=400,
            detail="Use the existing built-in pattern and add notes via the cheat sheet"
        )
    
    existing = await db.pattern_cheats.find_one(
        {"user_id": current_user["id"], "name": data.name}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Pattern with this name already exists")
    
    pattern_id = str(uuid.uuid4())
    doc = {
        "id": pattern_id,
        "user_id": current_user["id"],
        "name": data.name,
        "description": data.description,
        "notes": data.notes or "",
        "tags": data.tags or [],
        "is_builtin": False,
    }
    await db.pattern_cheats.insert_one(doc)
    return {**doc, "_id": None}


@api_router.put("/pattern-cheats/upsert", response_model=dict)
async def upsert_pattern_cheat(
    data: PatternCheatUpsert,
    current_user: dict = Depends(get_current_user)
):
    """Create or update pattern notes (for built-in or custom)."""
    existing = await db.pattern_cheats.find_one(
        {"user_id": current_user["id"], "name": data.name},
        {"_id": 0}
    )
    
    updates = {
        "description": data.description or "",
        "notes": data.notes or "",
        "tags": data.tags or [],
    }
    
    if existing:
        await db.pattern_cheats.update_one(
            {"id": existing["id"]},
            {"$set": updates}
        )
        return {**existing, **updates}
    
    # Create new (for built-in pattern when user first adds notes)
    pattern_id = str(uuid.uuid4())
    doc = {
        "id": pattern_id,
        "user_id": current_user["id"],
        "name": data.name,
        "description": updates["description"],
        "notes": updates["notes"],
        "tags": updates["tags"],
        "is_builtin": data.name in DSA_PATTERNS,
    }
    await db.pattern_cheats.insert_one(doc)
    return {**doc, "_id": None}


@api_router.patch("/pattern-cheats/{pattern_id}")
async def update_pattern_cheat(
    pattern_id: str,
    data: PatternCheatUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update pattern by id."""
    pattern = await db.pattern_cheats.find_one(
        {"id": pattern_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    updates = {}
    if data.description is not None:
        updates["description"] = data.description
    if data.notes is not None:
        updates["notes"] = data.notes
    if data.tags is not None:
        updates["tags"] = data.tags
    
    if updates:
        await db.pattern_cheats.update_one(
            {"id": pattern_id},
            {"$set": updates}
        )
    
    return {"message": "Updated", "id": pattern_id}


# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {"status": "OK", "message": "DSA Revision Tracker API is running"}

@api_router.get("/")
async def root():
    return {"message": "DSA Revision Tracker API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
