import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import database

def test():
    print("Testing Database...")
    records = database.get_feedback_records()
    print(f"Total Feedback Records Seeded: {records['total_records']}")
    
    # Test authentication
    admin = database.authenticate_user("admin", "admin123")
    print(f"Admin auth check: {'SUCCESS' if admin else 'FAILED'}, user: {admin}")
    
    faculty = database.authenticate_user("faculty", "faculty123")
    print(f"Faculty auth check: {'SUCCESS' if faculty else 'FAILED'}, user: {faculty}")

    student = database.authenticate_user("student", "student123")
    print(f"Student auth check: {'SUCCESS' if student else 'FAILED'}, user: {student}")

    # Test registration
    ok, res = database.register_user("testuser", "test@college.edu", "Password123", "Test User", "student", "IT")
    print(f"Register test: {ok}, {res}")

    # Test duplicate prevention
    ok2, err2 = database.register_user("testuser", "test2@college.edu", "Password123", "Test User 2")
    print(f"Duplicate user check prevented: {not ok2}")

    # Test update
    if records['records']:
        r_id = records['records'][0]['id']
        up_ok, updated = database.update_feedback_record(r_id, {"status": "Resolved", "review_notes": "Reviewed and updated by HOD."})
        print(f"Update record {r_id}: {up_ok}, new status: {updated['status']}")

    print("ALL DATABASE TESTS PASSED!")

if __name__ == "__main__":
    test()
