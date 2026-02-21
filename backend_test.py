import requests
import sys
import json
from datetime import datetime, date
from typing import Dict, Any

class SchoolManagementAPITester:
    def __init__(self, base_url="https://edutrack-sys-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.teacher_token = None
        self.office_staff_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "status": "PASS" if success else "FAIL", 
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{'✅' if success else '❌'} {name}: {details}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict[Any, Any] = None, token: str = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    details += f" - {error_detail}"
                except:
                    details += f" - {response.text[:100]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔐 TESTING AUTHENTICATION...")
        
        # Test admin login
        success, response = self.run_test(
            "Admin Login", "POST", "auth/login", 200,
            {"email": "admin@school.com", "password": "admin123"}
        )
        if success:
            self.admin_token = response.get('access_token')

        # Test invalid login
        self.run_test(
            "Invalid Login", "POST", "auth/login", 401,
            {"email": "invalid@test.com", "password": "wrong"}
        )

        # Test registration
        test_email = f"test_teacher_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "Teacher Registration", "POST", "auth/register", 200,
            {
                "email": test_email,
                "password": "password123",
                "name": "Test Teacher",
                "role": "teacher"
            }
        )
        
        # Test login with new teacher
        if success:
            success, response = self.run_test(
                "New Teacher Login", "POST", "auth/login", 200,
                {"email": test_email, "password": "password123"}
            )
            if success:
                self.teacher_token = response.get('access_token')

        # Test get current user
        if self.admin_token:
            self.run_test(
                "Get Current User", "GET", "auth/me", 200,
                token=self.admin_token
            )

    def test_user_management(self):
        """Test user management endpoints"""
        print("\n👥 TESTING USER MANAGEMENT...")
        
        if not self.admin_token:
            self.log_test("User Management Tests", False, "No admin token available")
            return

        # Get all users
        self.run_test(
            "Get All Users", "GET", "users", 200,
            token=self.admin_token
        )

        # Test access control - teacher can't access users
        if self.teacher_token:
            self.run_test(
                "Teacher Access Control - Users", "GET", "users", 403,
                token=self.teacher_token
            )

    def test_class_management(self):
        """Test class management endpoints"""
        print("\n🏫 TESTING CLASS MANAGEMENT...")
        
        if not self.admin_token:
            self.log_test("Class Management Tests", False, "No admin token available")
            return

        # Get all classes
        success, classes_response = self.run_test(
            "Get All Classes", "GET", "classes", 200,
            token=self.admin_token
        )

        # Create new class
        test_class_name = f"Test Class {datetime.now().strftime('%H%M%S')}"
        success, response = self.run_test(
            "Create Class", "POST", "classes", 200,
            {
                "name": test_class_name,
                "sections": ["A", "B"]
            },
            token=self.admin_token
        )
        
        created_class_id = response.get('id') if success else None

        # Test duplicate class creation
        if success:
            self.run_test(
                "Duplicate Class Creation", "POST", "classes", 400,
                {
                    "name": test_class_name,
                    "sections": ["A", "B"]
                },
                token=self.admin_token
            )

        # Delete created class
        if created_class_id:
            self.run_test(
                "Delete Class", "DELETE", f"classes/{created_class_id}", 200,
                token=self.admin_token
            )

    def test_student_management(self):
        """Test student management endpoints"""
        print("\n🎓 TESTING STUDENT MANAGEMENT...")
        
        if not self.admin_token:
            self.log_test("Student Management Tests", False, "No admin token available")
            return

        # Get all students
        success, students_response = self.run_test(
            "Get All Students", "GET", "students", 200,
            token=self.admin_token
        )

        # Create new student
        timestamp = datetime.now().strftime('%H%M%S')
        student_data = {
            "name": f"Test Student {timestamp}",
            "class_name": "Class 1",
            "section": "A", 
            "roll_no": f"TS{timestamp}",
            "parent_name": "Test Parent",
            "parent_contact": "9876543210",
            "address": "Test Address"
        }

        success, response = self.run_test(
            "Create Student", "POST", "students", 200,
            student_data, token=self.admin_token
        )
        
        created_student_id = response.get('id') if success else None

        # Get specific student
        if created_student_id:
            self.run_test(
                "Get Student by ID", "GET", f"students/{created_student_id}", 200,
                token=self.admin_token
            )

            # Update student
            updated_data = {**student_data, "name": f"Updated Student {timestamp}"}
            self.run_test(
                "Update Student", "PUT", f"students/{created_student_id}", 200,
                updated_data, token=self.admin_token
            )

            # Test role access - teacher can view but not delete
            if self.teacher_token:
                self.run_test(
                    "Teacher View Student", "GET", f"students/{created_student_id}", 200,
                    token=self.teacher_token
                )
                self.run_test(
                    "Teacher Delete Student Access", "DELETE", f"students/{created_student_id}", 403,
                    token=self.teacher_token
                )

            # Delete student (admin only)
            self.run_test(
                "Delete Student", "DELETE", f"students/{created_student_id}", 200,
                token=self.admin_token
            )

    def test_fee_management(self):
        """Test fee management endpoints"""
        print("\n💰 TESTING FEE MANAGEMENT...")
        
        if not self.admin_token:
            self.log_test("Fee Management Tests", False, "No admin token available")
            return

        # Get fee structures
        self.run_test(
            "Get Fee Structures", "GET", "fee-structures", 200,
            token=self.admin_token
        )

        # Create fee structure
        fee_data = {
            "class_name": "Class 1",
            "amount": 5000.0,
            "frequency": "monthly"
        }
        success, response = self.run_test(
            "Create Fee Structure", "POST", "fee-structures", 200,
            fee_data, token=self.admin_token
        )

        # Get fee payments
        self.run_test(
            "Get Fee Payments", "GET", "fee-payments", 200,
            token=self.admin_token
        )

        # Test creating fee payment (need a student first)
        students_response = requests.get(f"{self.base_url}/students", 
                                       headers={'Authorization': f'Bearer {self.admin_token}'})
        if students_response.status_code == 200 and students_response.json():
            first_student = students_response.json()[0]
            payment_data = {
                "student_id": first_student['id'],
                "amount": 2500.0,
                "payment_date": datetime.now().isoformat(),
                "month": "August",
                "year": 2025,
                "remarks": "Test payment"
            }
            
            success, payment_response = self.run_test(
                "Create Fee Payment", "POST", "fee-payments", 200,
                payment_data, token=self.admin_token
            )
            
            # Test PDF receipt generation
            if success:
                payment_id = payment_response.get('id')
                if payment_id:
                    receipt_response = requests.get(
                        f"{self.base_url}/fee-payments/{payment_id}/receipt",
                        headers={'Authorization': f'Bearer {self.admin_token}'}
                    )
                    success = receipt_response.status_code == 200
                    self.log_test(
                        "Generate PDF Receipt", success,
                        f"Status: {receipt_response.status_code}, Content-Type: {receipt_response.headers.get('content-type', 'unknown')}"
                    )
                    
                    # Test student payment history
                    self.run_test(
                        "Get Student Payment History", "GET", f"fee-payments/student/{first_student['id']}", 200,
                        token=self.admin_token
                    )
        else:
            self.log_test("Fee Payment Tests", False, "No students available for testing")

    def test_teacher_attendance(self):
        """Test teacher attendance endpoints"""
        print("\n👨‍🏫 TESTING TEACHER ATTENDANCE...")
        
        if not self.teacher_token:
            self.log_test("Teacher Attendance Tests", False, "No teacher token available")
            return

        # Get today's attendance
        self.run_test(
            "Get Today Attendance", "GET", "teacher-attendance/today", 200,
            token=self.teacher_token
        )

        # Test check-in
        success, response = self.run_test(
            "Teacher Check-in", "POST", "teacher-attendance/check-in", 200,
            {"check_in": datetime.now().isoformat()},
            token=self.teacher_token
        )

        attendance_id = response.get('id') if success else None

        # Test duplicate check-in (should fail)
        self.run_test(
            "Duplicate Check-in", "POST", "teacher-attendance/check-in", 400,
            {"check_in": datetime.now().isoformat()},
            token=self.teacher_token
        )

        # Test check-out
        if attendance_id:
            self.run_test(
                "Teacher Check-out", "POST", "teacher-attendance/check-out", 200,
                {"attendance_id": attendance_id},
                token=self.teacher_token
            )

        # Get attendance history
        self.run_test(
            "Get Teacher Attendance History", "GET", "teacher-attendance", 200,
            token=self.teacher_token
        )

    def test_student_attendance(self):
        """Test student attendance endpoints"""
        print("\n📚 TESTING STUDENT ATTENDANCE...")
        
        if not self.teacher_token:
            self.log_test("Student Attendance Tests", False, "No teacher token available")
            return

        # Get student attendance
        self.run_test(
            "Get Student Attendance", "GET", "student-attendance", 200,
            token=self.teacher_token
        )

        # Test bulk attendance marking (need students)
        students_response = requests.get(f"{self.base_url}/students", 
                                       headers={'Authorization': f'Bearer {self.teacher_token}'})
        if students_response.status_code == 200 and students_response.json():
            students = students_response.json()
            class_1_students = [s for s in students if s['class_name'] == 'Class 1' and s['section'] == 'A']
            
            if class_1_students:
                attendance_list = [
                    {"student_id": student['id'], "status": "present" if i % 2 == 0 else "absent"}
                    for i, student in enumerate(class_1_students[:3])
                ]
                
                bulk_data = {
                    "class_name": "Class 1",
                    "section": "A",
                    "date": date.today().isoformat(),
                    "attendance_list": attendance_list
                }
                
                self.run_test(
                    "Bulk Student Attendance", "POST", "student-attendance/bulk", 200,
                    bulk_data, token=self.teacher_token
                )

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 TESTING DASHBOARD STATS...")
        
        if not self.admin_token:
            self.log_test("Dashboard Stats Test", False, "No admin token available")
            return

        success, response = self.run_test(
            "Get Dashboard Stats", "GET", "dashboard/stats", 200,
            token=self.admin_token
        )
        
        if success:
            required_keys = ['total_students', 'total_teachers', 'total_fees_collected', 
                           'monthly_fees_collected', 'teacher_present_today', 'student_present_today']
            missing_keys = [key for key in required_keys if key not in response]
            
            if not missing_keys:
                self.log_test("Dashboard Stats Content", True, "All required stats present")
            else:
                self.log_test("Dashboard Stats Content", False, f"Missing keys: {missing_keys}")

    def test_role_based_access(self):
        """Test role-based access control"""
        print("\n🔒 TESTING ROLE-BASED ACCESS CONTROL...")
        
        if not all([self.admin_token, self.teacher_token]):
            self.log_test("Role Access Tests", False, "Missing required tokens")
            return

        # Test admin-only endpoints with teacher token
        self.run_test(
            "Teacher Access to Users", "GET", "users", 403,
            token=self.teacher_token
        )

        # Test student deletion (admin only)
        students_response = requests.get(f"{self.base_url}/students", 
                                       headers={'Authorization': f'Bearer {self.admin_token}'})
        if students_response.status_code == 200 and students_response.json():
            student_id = students_response.json()[0]['id']
            self.run_test(
                "Teacher Delete Student", "DELETE", f"students/{student_id}", 403,
                token=self.teacher_token
            )

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 STARTING SCHOOL MANAGEMENT API TESTS")
        print(f"📡 Testing against: {self.base_url}")
        
        # Run test suites in order
        self.test_authentication()
        self.test_user_management() 
        self.test_class_management()
        self.test_student_management()
        self.test_fee_management()
        self.test_teacher_attendance()
        self.test_student_attendance()
        self.test_dashboard_stats()
        self.test_role_based_access()

        # Print summary
        print(f"\n📊 FINAL RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed, self.tests_run, self.test_results

def main():
    tester = SchoolManagementAPITester()
    passed, total, results = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_results_backend.json', 'w') as f:
        json.dump({
            "summary": f"{passed}/{total} tests passed",
            "success_rate": f"{(passed/total)*100:.1f}%",
            "test_results": results,
            "timestamp": datetime.now().isoformat()
        }, f, indent=2)
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())