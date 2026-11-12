import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app
import database

def test_endpoints():
    client = app.test_client()

    print("[1] Testing GET / (Home page)...")
    res = client.get('/')
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    print("    -> Passed! Status:", res.status_code)

    print("[2] Testing GET /api/auth/me (Unauthenticated)...")
    res = client.get('/api/auth/me')
    assert res.status_code == 200
    data = res.get_json()
    assert data.get('authenticated') is False
    print("    -> Passed! Status:", res.status_code, "Auth:", data.get('authenticated'))

    print("[3] Testing POST /api/auth/login (Admin)...")
    res = client.post('/api/auth/login', json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200, f"Login failed: {res.get_json()}"
    data = res.get_json()
    assert data.get('success') is True
    print("    -> Passed! Admin logged in:", data['user']['username'])

    print("[4] Testing GET /api/auth/me (Authenticated Admin)...")
    res = client.get('/api/auth/me')
    assert res.status_code == 200
    data = res.get_json()
    assert data.get('authenticated') is True
    assert data['user']['role'] == 'admin'
    print("    -> Passed! Session holds user:", data['user']['username'])

    print("[5] Testing POST /api/evaluate (PDF Section 3 benchmark)...")
    res = client.post('/api/evaluate', json={"text": "The faculty explains concepts clearly, but the lab computers are very slow."})
    assert res.status_code == 200, f"Evaluate failed: {res.get_json()}"
    report = res.get_json()
    print("    -> Polarity:", report['overall_sentiment'])
    print("    -> Aspects:", [(a['aspect'], a['polarity']) for a in report['aspects_breakdown']])
    print("    -> Issue:", report['identified_issue'])
    assert report['overall_sentiment'] == "Mixed"
    assert report['identified_issue'] == "Slow laboratory computers"
    print("    -> Passed! Exact PDF Section 3 Expected Output verified.")

    print("[6] Testing POST /api/feedback/submit (New student feedback into DB)...")
    sub_payload = {
        "student_name": "Divya Sharma",
        "student_id": "STU99001",
        "department": "CSE",
        "academic_year": "3rd Year",
        "semester": "II",
        "course_name": "Distributed Systems",
        "faculty_name": "Dr. Suresh",
        "rating": 5,
        "feedback_text": "The faculty provides outstanding project guidance and mentoring throughout the semester."
    }
    res = client.post('/api/feedback/submit', json=sub_payload)
    assert res.status_code == 201, f"Submit failed: {res.get_json()}"
    sub_res = res.get_json()
    rec_id = sub_res['record']['id']
    print(f"    -> Passed! Inserted record #{rec_id} ({sub_res['record']['ticket_id']}), Polarity: {sub_res['record']['overall_sentiment']}")

    print("[7] Testing GET /api/records (Search & Filter)...")
    res = client.get('/api/records?q=Distributed&page=1&per_page=10')
    assert res.status_code == 200
    rec_list = res.get_json()
    assert rec_list['total_records'] >= 1
    print(f"    -> Passed! Found {rec_list['total_records']} matching records.")

    print("[8] Testing PUT /api/records/<id> (Update Status & Notes)...")
    res = client.put(f'/api/records/{rec_id}', json={"status": "Under Review", "review_notes": "Assigned to Department Academic Committee."})
    assert res.status_code == 200
    up_data = res.get_json()
    assert up_data['record']['status'] == "Under Review"
    print(f"    -> Passed! Status updated to: {up_data['record']['status']}")

    print("[9] Testing GET /api/dashboard (Aggregated metrics)...")
    res = client.get('/api/dashboard')
    assert res.status_code == 200
    dash = res.get_json()
    assert dash['total_feedback'] >= 5000
    print(f"    -> Passed! Total feedback count: {dash['total_feedback']}, DB records: {dash.get('database_records_count')}")

    print("[10] Testing DELETE /api/records/<id>...")
    res = client.delete(f'/api/records/{rec_id}')
    assert res.status_code == 200
    print("    -> Passed! Record successfully deleted.")

    print("\nALL 10 BACKEND INTEGRATION & API TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    test_endpoints()
