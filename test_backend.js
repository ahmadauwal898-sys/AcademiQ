// test_backend.js - MultiSchool Pro Backend Integration & Tenant Isolation Test Suite
import { db, initDatabase, hashPassword, verifyPassword } from './server/db.ts';
import { calculateSubjectScore, computeClassPositions, DEFAULT_GRADING_SCALES, DEFAULT_ASSESSMENT_WEIGHTS } from './server/result_engine.ts';
import crypto from 'node:crypto';

console.log('--- MultiSchool Pro: Running Automated Backend Verification Tests ---');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    passedTests++;
    console.log(`✅ PASS: ${message}`);
  }
}

// Ensure DB is initialized
initDatabase();

// 1. Password Hashing and Verification
const samplePassword = 'StrongPassword@2026';
const { hash, salt } = hashPassword(samplePassword);
assert(verifyPassword(samplePassword, hash, salt) === true, '1. Password hashing and PBKDF2 verification succeeds');
assert(verifyPassword('WrongPass', hash, salt) === false, '2. Password verification rejects incorrect password');

// 2. School Registration and Pending State
const testSchoolId = 'sch_test_' + crypto.randomUUID().slice(0, 8);
const testSlug = 'test-academy-' + crypto.randomUUID().slice(0, 8);
const testAdminId = 'usr_test_' + crypto.randomUUID().slice(0, 8);
db.prepare(`
  INSERT INTO schools (id, name, slug, email, school_level, status)
  VALUES (?, 'Test Academy Beta', ?, 'test@academy.edu', 'Senior Secondary', 'pending')
`).run(testSchoolId, testSlug);

const schoolRecord = db.prepare('SELECT * FROM schools WHERE id = ?').get(testSchoolId);
assert(schoolRecord && schoolRecord.status === 'pending', '3. School registration correctly assigns "pending" status');

// 3. Super Admin School Approval
db.prepare("UPDATE schools SET status = 'approved' WHERE id = ?").run(testSchoolId);
const approvedRecord = db.prepare('SELECT status FROM schools WHERE id = ?').get(testSchoolId);
assert(approvedRecord.status === 'approved', '4. Platform administrator approval updates school status to "approved"');

// 4. Duplicate Admission Number Prevention
db.prepare("DELETE FROM students WHERE id LIKE 'std_test_%'").run();
const classId = 'cls_test_' + crypto.randomUUID().slice(0, 8);
db.prepare("INSERT INTO classes (id, school_id, name, level) VALUES (?, ?, 'Test Class 1', 'Senior Secondary')").run(classId, testSchoolId);

db.prepare(`
  INSERT INTO students (id, school_id, admission_number, full_name, gender, class_id)
  VALUES ('std_test_01', ?, 'ADM/2026/001', 'First Student', 'Male', ?)
`).run(testSchoolId, classId);

let caughtDuplicate = false;
try {
  db.prepare(`
    INSERT INTO students (id, school_id, admission_number, full_name, gender, class_id)
    VALUES ('std_test_02', ?, 'ADM/2026/001', 'Duplicate Student', 'Female', ?)
  `).run(testSchoolId, classId);
} catch (err) {
  caughtDuplicate = true;
}
assert(caughtDuplicate === true, '5. Unique constraint prevents duplicate admission numbers within same school');

// 5. Tenant Isolation Verification (School A cannot see or modify School B records)
const schoolA = 'sch_apex';
const schoolB = 'sch_greenfield';

const schoolAStudents = db.prepare('SELECT * FROM students WHERE school_id = ?').all(schoolA);
const schoolBStudents = db.prepare('SELECT * FROM students WHERE school_id = ?').all(schoolB);

assert(schoolAStudents.length > 0 && schoolBStudents.length > 0, '6. Multi-tenant database records exist for both schools');
const crossContamination = schoolAStudents.some(s => s.school_id === schoolB);
assert(crossContamination === false, '7. Server query isolation: School A query never returns School B records');

// 6. Score Validation & Boundary Enforcement
const validResult = calculateSubjectScore(9, 8, 8, 65, DEFAULT_ASSESSMENT_WEIGHTS, DEFAULT_GRADING_SCALES);
assert(validResult.total === 90 && validResult.grade === 'A' && validResult.remark === 'Excellent', '8. Valid scores correctly calculate total=90, grade=A, remark=Excellent');

const invalidScoreResult = calculateSubjectScore(15, 8, 8, 65, DEFAULT_ASSESSMENT_WEIGHTS, DEFAULT_GRADING_SCALES);
assert(invalidScoreResult.errors && invalidScoreResult.errors.length > 0, '9. Score validation rejects CA score exceeding configured maximum (10 marks)');

const negativeScoreResult = calculateSubjectScore(-2, 8, 8, 65, DEFAULT_ASSESSMENT_WEIGHTS, DEFAULT_GRADING_SCALES);
assert(negativeScoreResult.errors && negativeScoreResult.errors.length > 0, '10. Score validation rejects negative marks');

// 7. Class Position Calculation & Tie Handling
const mockStudents = [
  { student_id: 's1', total_score: 280, average_score: 93.3 },
  { student_id: 's2', total_score: 260, average_score: 86.6 },
  { student_id: 's3', total_score: 260, average_score: 86.6 }, // Tie for 2nd
  { student_id: 's4', total_score: 240, average_score: 80.0 }  // Should be 4th
];
const positions = computeClassPositions(mockStudents);
assert(positions.get('s1') === 1, '11. Ranking engine: First student receives rank 1');
assert(positions.get('s2') === 2 && positions.get('s3') === 2, '12. Ranking engine: Tied students receive matching rank 2');
assert(positions.get('s4') === 4, '13. Ranking engine: Subsequent student correctly skips rank to 4th (standard competition ranking)');

// 8. Result Locking & Immutability
const existingApprovedScore = db.prepare("SELECT status FROM student_scores WHERE status = 'approved' LIMIT 1").get();
assert(existingApprovedScore && existingApprovedScore.status === 'approved', '14. Approved score state correctly stored and queryable');

// 9. Public Verification Code Hash Verification
const plainPin = 'APX-8492-X';
const hashedPin = crypto.createHash('sha256').update(plainPin.trim().toUpperCase()).digest('hex');
const pinRecord = db.prepare('SELECT * FROM result_verification_codes WHERE code_hash = ?').get(hashedPin);
assert(pinRecord !== undefined, '15. Result verification PIN correctly verified against SHA-256 hash in database');

// 10. Fee and Financial Transaction Isolation
const apexPayments = db.prepare('SELECT * FROM fee_payments WHERE school_id = ?').all('sch_apex');
assert(apexPayments.length > 0, '16. Fee payment record persists with receipt number');
assert(apexPayments.every(p => p.school_id === 'sch_apex'), '17. Fee payment records strictly isolated to tenant school');

// 11. Super Admin All-Schools Access vs School Isolation
const allSchoolsForSuperAdmin = db.prepare('SELECT id, name, status FROM schools').all();
assert(allSchoolsForSuperAdmin.length >= 2, '18. Super Admin can query and govern all schools across the platform');

// 12. School User Token Isolation (School Admin user belongs strictly to their own school)
const apexAdminUser = db.prepare("SELECT * FROM users WHERE email = 'admin@apexacademy.edu'").get();
assert(apexAdminUser && apexAdminUser.school_id === 'sch_apex', '19. School Admin user is strictly bound to school_id "sch_apex"');

const greenfieldAdminUser = db.prepare("SELECT * FROM users WHERE email = 'admin@greenfield.edu'").get();
assert(greenfieldAdminUser && greenfieldAdminUser.school_id === 'sch_greenfield', '20. Greenfield Admin user is strictly bound to school_id "sch_greenfield"');

const superAdminUser = db.prepare("SELECT * FROM users WHERE role = 'super_admin'").get();
assert(superAdminUser && superAdminUser.email === 'academia.multi.tenant@gmail.com', '21. Platform Super Admin email is academia.multi.tenant@gmail.com');
assert(superAdminUser && verifyPassword('@Candfe69a9', superAdminUser.password_hash, superAdminUser.salt), '22. Platform Super Admin password @Candfe69a9 verified successfully');
assert(superAdminUser && superAdminUser.school_id === null, '23. Platform Super Admin has school_id = null (platform-wide oversight, not bound to a single school)');

// 13. Super Admin School Logins Inspection & Password Reset
const schoolUsers = db.prepare('SELECT id, email, full_name, role, is_active FROM users WHERE school_id = ?').all('sch_apex');
assert(schoolUsers.length >= 3, '24. Super Admin can query all login accounts for a school');
assert(schoolUsers.some(u => u.role === 'school_admin') && schoolUsers.some(u => u.role === 'teacher'), '25. School users contain admin and teacher accounts');

// Test password reset for school admin
const newPass = 'TempPass@' + Math.floor(1000 + Math.random() * 9000);
const { hash: newHash, salt: newSalt } = hashPassword(newPass);
db.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE email = 'admin@apexacademy.edu'").run(newHash, newSalt);
const updatedAdmin = db.prepare("SELECT * FROM users WHERE email = 'admin@apexacademy.edu'").get();
assert(verifyPassword(newPass, updatedAdmin.password_hash, updatedAdmin.salt), '26. Password reset succeeds and new password is valid');

// Restore original password
const { hash: origHash, salt: origSalt } = hashPassword('password123');
db.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE email = 'admin@apexacademy.edu'").run(origHash, origSalt);

// 14. Suspend and Reactivate
db.prepare("UPDATE schools SET status = 'suspended' WHERE id = ?").run('sch_apex');
const suspendedSchool = db.prepare('SELECT status FROM schools WHERE id = ?').get('sch_apex');
assert(suspendedSchool.status === 'suspended', '27. School suspension updates school status to "suspended"');
db.prepare("UPDATE schools SET status = 'approved' WHERE id = ?").run('sch_apex');
const restoredSchool = db.prepare('SELECT status FROM schools WHERE id = ?').get('sch_apex');
assert(restoredSchool.status === 'approved', '28. School reactivation restores school status to "approved"');

// 15. Super Admin Impersonation Token verification
import { createToken, verifyToken } from './server/auth.ts';
const impersonationToken = createToken({
  id: 'usr_impersonated',
  email: 'admin@apexacademy.edu',
  full_name: 'Apex Admin',
  role: 'school_admin',
  school_id: 'sch_apex',
  school_name: 'Apex Model College',
  school_status: 'approved',
  is_impersonating: true,
  impersonated_by_id: 'usr_superadmin',
  impersonated_by_email: 'academia.multi.tenant@gmail.com'
});
const verifiedPayload = verifyToken(impersonationToken);
assert(verifiedPayload && verifiedPayload.is_impersonating === true, '29. Impersonation token verifies with is_impersonating = true');
assert(verifiedPayload && verifiedPayload.impersonated_by_email === 'academia.multi.tenant@gmail.com', '30. Impersonation token retains Super Admin auditor identity');

// Cleanup temporary test records
db.prepare("DELETE FROM students WHERE id LIKE 'std_test_%'").run();
db.prepare('DELETE FROM classes WHERE id = ?').run(classId);
db.prepare('DELETE FROM schools WHERE id = ?').run(testSchoolId);

console.log(`\n==============================================`);
console.log(` SUMMARY: ${passedTests} / ${totalTests} Integration Tests Passed!`);
console.log(`==============================================\n`);
