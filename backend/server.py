from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta, date
from passlib.context import CryptContext
from jose import JWTError, jwt
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from io import BytesIO
from fastapi.responses import StreamingResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", "school-management-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

# ===== Models =====
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    name: str
    role: str  # admin, teacher, office_staff
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Class(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    sections: List[str]

class ClassCreate(BaseModel):
    name: str
    sections: List[str]

class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    class_name: str
    section: str
    roll_no: str
    parent_contact: str
    parent_name: str
    address: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudentCreate(BaseModel):
    name: str
    class_name: str
    section: str
    roll_no: str
    parent_contact: str
    parent_name: str
    address: str

class FeeStructure(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    class_name: str
    amount: float
    frequency: str  # monthly, quarterly, annual
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FeeStructureCreate(BaseModel):
    class_name: str
    amount: float
    frequency: str

class FeePayment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    student_id: str
    student_name: str
    class_name: str
    section: str
    amount: float
    payment_date: datetime
    month: str
    year: int
    remarks: Optional[str] = None
    recorded_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FeePaymentCreate(BaseModel):
    student_id: str
    amount: float
    payment_date: datetime
    month: str
    year: int
    remarks: Optional[str] = None

class TeacherAttendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    teacher_id: str
    teacher_name: str
    check_in: datetime
    check_out: Optional[datetime] = None
    date: str
    status: str  # on_time, late, early_leave
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeacherAttendanceCreate(BaseModel):
    check_in: datetime

class TeacherCheckout(BaseModel):
    attendance_id: str

class StudentAttendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    student_id: str
    student_name: str
    class_name: str
    section: str
    date: str
    status: str  # present, absent, leave
    marked_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudentAttendanceCreate(BaseModel):
    student_id: str
    status: str
    date: str

class BulkStudentAttendance(BaseModel):
    class_name: str
    section: str
    date: str
    attendance_list: List[Dict[str, str]]  # [{student_id, status}]

# ===== Helper Functions =====
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"email": email}, {"_id": 0, "password": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

def require_role(*allowed_roles):
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not authorized to perform this action")
        return current_user
    return role_checker

# ===== Auth Routes =====
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_data.model_dump()
    user_dict["password"] = get_password_hash(user_dict["password"])
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.insert_one(user_dict)
    del user_dict["password"]
    return User(**user_dict)

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user["email"]})
    del user["password"]
    return Token(access_token=access_token, token_type="bearer", user=User(**user))

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ===== User Management Routes =====
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(require_role("admin"))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.delete("/users/{email}")
async def delete_user(email: str, current_user: User = Depends(require_role("admin"))):
    if email == current_user.email:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    result = await db.users.delete_one({"email": email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

# ===== Class Management Routes =====
@api_router.post("/classes", response_model=Class)
async def create_class(class_data: ClassCreate, current_user: User = Depends(require_role("admin"))):
    existing = await db.classes.find_one({"name": class_data.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Class already exists")
    
    class_dict = class_data.model_dump()
    class_dict["id"] = f"class_{class_data.name.lower().replace(' ', '_')}"
    await db.classes.insert_one(class_dict)
    return Class(**class_dict)

@api_router.get("/classes", response_model=List[Class])
async def get_classes(current_user: User = Depends(get_current_user)):
    classes = await db.classes.find({}, {"_id": 0}).to_list(1000)
    return classes

@api_router.delete("/classes/{class_id}")
async def delete_class(class_id: str, current_user: User = Depends(require_role("admin"))):
    result = await db.classes.delete_one({"id": class_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Class not found")
    return {"message": "Class deleted successfully"}

# ===== Student Management Routes =====
@api_router.post("/students", response_model=Student)
async def create_student(student_data: StudentCreate, current_user: User = Depends(require_role("admin", "office_staff"))):
    student_dict = student_data.model_dump()
    student_dict["id"] = f"std_{datetime.now(timezone.utc).timestamp()}"
    student_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.students.insert_one(student_dict)
    return Student(**student_dict)

@api_router.get("/students", response_model=List[Student])
async def get_students(current_user: User = Depends(get_current_user)):
    students = await db.students.find({}, {"_id": 0}).to_list(10000)
    for student in students:
        if isinstance(student.get("created_at"), str):
            student["created_at"] = datetime.fromisoformat(student["created_at"])
    return students

@api_router.get("/students/{student_id}", response_model=Student)
async def get_student(student_id: str, current_user: User = Depends(get_current_user)):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if isinstance(student.get("created_at"), str):
        student["created_at"] = datetime.fromisoformat(student["created_at"])
    return Student(**student)

@api_router.put("/students/{student_id}", response_model=Student)
async def update_student(student_id: str, student_data: StudentCreate, current_user: User = Depends(require_role("admin", "office_staff"))):
    student_dict = student_data.model_dump()
    result = await db.students.update_one({"id": student_id}, {"$set": student_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    
    updated = await db.students.find_one({"id": student_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return Student(**updated)

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str, current_user: User = Depends(require_role("admin"))):
    result = await db.students.delete_one({"id": student_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student deleted successfully"}

# ===== Fee Management Routes =====
@api_router.post("/fee-structures", response_model=FeeStructure)
async def create_fee_structure(fee_data: FeeStructureCreate, current_user: User = Depends(require_role("admin", "office_staff"))):
    fee_dict = fee_data.model_dump()
    fee_dict["id"] = f"fee_{fee_data.class_name.lower().replace(' ', '_')}"
    fee_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    existing = await db.fee_structures.find_one({"class_name": fee_data.class_name}, {"_id": 0})
    if existing:
        await db.fee_structures.update_one({"class_name": fee_data.class_name}, {"$set": fee_dict})
    else:
        await db.fee_structures.insert_one(fee_dict)
    
    return FeeStructure(**fee_dict)

@api_router.get("/fee-structures", response_model=List[FeeStructure])
async def get_fee_structures(current_user: User = Depends(get_current_user)):
    fees = await db.fee_structures.find({}, {"_id": 0}).to_list(1000)
    for fee in fees:
        if isinstance(fee.get("created_at"), str):
            fee["created_at"] = datetime.fromisoformat(fee["created_at"])
    return fees

@api_router.post("/fee-payments", response_model=FeePayment)
async def create_fee_payment(payment_data: FeePaymentCreate, current_user: User = Depends(require_role("admin", "office_staff"))):
    student = await db.students.find_one({"id": payment_data.student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    payment_dict = payment_data.model_dump()
    payment_dict["id"] = f"pay_{datetime.now(timezone.utc).timestamp()}"
    payment_dict["student_name"] = student["name"]
    payment_dict["class_name"] = student["class_name"]
    payment_dict["section"] = student["section"]
    payment_dict["recorded_by"] = current_user.email
    payment_dict["payment_date"] = payment_dict["payment_date"].isoformat()
    payment_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.fee_payments.insert_one(payment_dict)
    return FeePayment(**{**payment_dict, "payment_date": datetime.fromisoformat(payment_dict["payment_date"])})

@api_router.get("/fee-payments", response_model=List[FeePayment])
async def get_fee_payments(current_user: User = Depends(get_current_user)):
    payments = await db.fee_payments.find({}, {"_id": 0}).to_list(10000)
    for payment in payments:
        if isinstance(payment.get("payment_date"), str):
            payment["payment_date"] = datetime.fromisoformat(payment["payment_date"])
        if isinstance(payment.get("created_at"), str):
            payment["created_at"] = datetime.fromisoformat(payment["created_at"])
    return payments

@api_router.get("/fee-payments/student/{student_id}", response_model=List[FeePayment])
async def get_student_payments(student_id: str, current_user: User = Depends(get_current_user)):
    payments = await db.fee_payments.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    for payment in payments:
        if isinstance(payment.get("payment_date"), str):
            payment["payment_date"] = datetime.fromisoformat(payment["payment_date"])
        if isinstance(payment.get("created_at"), str):
            payment["created_at"] = datetime.fromisoformat(payment["created_at"])
    return payments

@api_router.get("/fee-payments/{payment_id}/receipt")
async def generate_fee_receipt(payment_id: str, current_user: User = Depends(get_current_user)):
    payment = await db.fee_payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#047857'), alignment=TA_CENTER)
    story.append(Paragraph("School Fee Receipt", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    receipt_data = [
        ["Receipt ID:", payment["id"]],
        ["Student Name:", payment["student_name"]],
        ["Class:", f"{payment['class_name']} - {payment['section']}"],
        ["Month/Year:", f"{payment['month']} {payment['year']}"],
        ["Amount Paid:", f"₹{payment['amount']:.2f}"],
        ["Payment Date:", payment["payment_date"] if isinstance(payment["payment_date"], str) else payment["payment_date"].strftime("%d %b %Y")],
        ["Remarks:", payment.get("remarks", "N/A")],
    ]
    
    table = Table(receipt_data, colWidths=[2*inch, 4*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f1f5f9')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0'))
    ]))
    
    story.append(table)
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("Thank you for your payment!", styles['Normal']))
    
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=receipt_{payment_id}.pdf"})

# ===== Teacher Attendance Routes =====
@api_router.post("/teacher-attendance/check-in", response_model=TeacherAttendance)
async def teacher_check_in(attendance_data: TeacherAttendanceCreate, current_user: User = Depends(require_role("teacher", "admin"))):
    today = datetime.now(timezone.utc).date().isoformat()
    existing = await db.teacher_attendance.find_one({"teacher_id": current_user.email, "date": today}, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Already checked in today")
    
    check_in_time = attendance_data.check_in
    status = "on_time" if check_in_time.hour < 9 else "late"
    
    attendance_dict = {
        "id": f"att_{datetime.now(timezone.utc).timestamp()}",
        "teacher_id": current_user.email,
        "teacher_name": current_user.name,
        "check_in": check_in_time.isoformat(),
        "check_out": None,
        "date": today,
        "status": status,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.teacher_attendance.insert_one(attendance_dict)
    return TeacherAttendance(**{**attendance_dict, "check_in": check_in_time})

@api_router.post("/teacher-attendance/check-out", response_model=TeacherAttendance)
async def teacher_check_out(checkout_data: TeacherCheckout, current_user: User = Depends(require_role("teacher", "admin"))):
    attendance = await db.teacher_attendance.find_one({"id": checkout_data.attendance_id}, {"_id": 0})
    
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    if attendance["check_out"]:
        raise HTTPException(status_code=400, detail="Already checked out")
    
    check_out_time = datetime.now(timezone.utc)
    update_dict = {"check_out": check_out_time.isoformat()}
    
    if check_out_time.hour < 17:
        update_dict["status"] = "early_leave"
    
    await db.teacher_attendance.update_one({"id": checkout_data.attendance_id}, {"$set": update_dict})
    updated = await db.teacher_attendance.find_one({"id": checkout_data.attendance_id}, {"_id": 0})
    
    return TeacherAttendance(**{
        **updated, 
        "check_in": datetime.fromisoformat(updated["check_in"]),
        "check_out": datetime.fromisoformat(updated["check_out"]) if updated["check_out"] else None
    })

@api_router.get("/teacher-attendance", response_model=List[TeacherAttendance])
async def get_teacher_attendance(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == "teacher":
        query["teacher_id"] = current_user.email
    
    attendance = await db.teacher_attendance.find(query, {"_id": 0}).to_list(10000)
    for att in attendance:
        if isinstance(att.get("check_in"), str):
            att["check_in"] = datetime.fromisoformat(att["check_in"])
        if att.get("check_out") and isinstance(att["check_out"], str):
            att["check_out"] = datetime.fromisoformat(att["check_out"])
        if isinstance(att.get("created_at"), str):
            att["created_at"] = datetime.fromisoformat(att["created_at"])
    return attendance

@api_router.get("/teacher-attendance/today")
async def get_today_attendance(current_user: User = Depends(require_role("teacher", "admin"))):
    today = datetime.now(timezone.utc).date().isoformat()
    attendance = await db.teacher_attendance.find_one({"teacher_id": current_user.email, "date": today}, {"_id": 0})
    
    if not attendance:
        return {"checked_in": False, "attendance": None}
    
    if isinstance(attendance.get("check_in"), str):
        attendance["check_in"] = datetime.fromisoformat(attendance["check_in"])
    if attendance.get("check_out") and isinstance(attendance["check_out"], str):
        attendance["check_out"] = datetime.fromisoformat(attendance["check_out"])
    
    return {"checked_in": True, "attendance": TeacherAttendance(**attendance)}

# ===== Student Attendance Routes =====
@api_router.post("/student-attendance", response_model=StudentAttendance)
async def mark_student_attendance(attendance_data: StudentAttendanceCreate, current_user: User = Depends(require_role("teacher", "admin"))):
    student = await db.students.find_one({"id": attendance_data.student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    existing = await db.student_attendance.find_one({
        "student_id": attendance_data.student_id,
        "date": attendance_data.date
    }, {"_id": 0})
    
    attendance_dict = {
        "id": f"satt_{datetime.now(timezone.utc).timestamp()}",
        "student_id": attendance_data.student_id,
        "student_name": student["name"],
        "class_name": student["class_name"],
        "section": student["section"],
        "date": attendance_data.date,
        "status": attendance_data.status,
        "marked_by": current_user.email,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.student_attendance.update_one(
            {"student_id": attendance_data.student_id, "date": attendance_data.date},
            {"$set": {"status": attendance_data.status, "marked_by": current_user.email}}
        )
    else:
        await db.student_attendance.insert_one(attendance_dict)
    
    return StudentAttendance(**attendance_dict)

@api_router.post("/student-attendance/bulk")
async def mark_bulk_attendance(bulk_data: BulkStudentAttendance, current_user: User = Depends(require_role("teacher", "admin"))):
    students = await db.students.find({"class_name": bulk_data.class_name, "section": bulk_data.section}, {"_id": 0}).to_list(1000)
    
    for att_item in bulk_data.attendance_list:
        student = next((s for s in students if s["id"] == att_item["student_id"]), None)
        if student:
            attendance_dict = {
                "id": f"satt_{att_item['student_id']}_{bulk_data.date}",
                "student_id": att_item["student_id"],
                "student_name": student["name"],
                "class_name": bulk_data.class_name,
                "section": bulk_data.section,
                "date": bulk_data.date,
                "status": att_item["status"],
                "marked_by": current_user.email,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.student_attendance.update_one(
                {"student_id": att_item["student_id"], "date": bulk_data.date},
                {"$set": attendance_dict},
                upsert=True
            )
    
    return {"message": "Attendance marked successfully"}

@api_router.get("/student-attendance", response_model=List[StudentAttendance])
async def get_student_attendance(class_name: Optional[str] = None, date: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if class_name:
        query["class_name"] = class_name
    if date:
        query["date"] = date
    
    attendance = await db.student_attendance.find(query, {"_id": 0}).to_list(10000)
    for att in attendance:
        if isinstance(att.get("created_at"), str):
            att["created_at"] = datetime.fromisoformat(att["created_at"])
    return attendance

# ===== Dashboard Stats =====
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_students = await db.students.count_documents({})
    total_teachers = await db.users.count_documents({"role": "teacher"})
    
    payments = await db.fee_payments.find({}, {"_id": 0}).to_list(10000)
    total_collected = sum(p["amount"] for p in payments)
    
    current_month = datetime.now(timezone.utc).strftime("%B")
    current_year = datetime.now(timezone.utc).year
    monthly_collected = sum(p["amount"] for p in payments if p["month"] == current_month and p["year"] == current_year)
    
    today = datetime.now(timezone.utc).date().isoformat()
    teacher_present_today = await db.teacher_attendance.count_documents({"date": today})
    
    student_present_today = await db.student_attendance.count_documents({"date": today, "status": "present"})
    
    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_fees_collected": total_collected,
        "monthly_fees_collected": monthly_collected,
        "teacher_present_today": teacher_present_today,
        "student_present_today": student_present_today
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
