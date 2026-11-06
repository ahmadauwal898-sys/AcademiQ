import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';

// Ensure Firebase client session is authenticated
async function ensureFirebaseAuth(): Promise<void> {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn('Firebase Auth note:', e);
    }
  }
}

export interface CloudSyncResult {
  success: boolean;
  timestamp: string;
  projectId: string;
  databaseId: string;
  totalSynced: {
    students: number;
    teachers?: number;
    parents?: number;
    attendance?: number;
    fees?: number;
    scores: number;
    results: number;
    subjects: number;
  };
  error?: string;
}

export interface CloudSyncStatus {
  lastSyncTimestamp: string | null;
  totalRecords: number;
  isSynced: boolean;
  projectId: string;
  databaseId: string;
}

/**
 * Synchronizes complete school academic state, students, assessment scores,
 * and compiled report card results directly into Firebase Firestore.
 */
export async function syncSchoolToFirestore(
  schoolId: string,
  token: string
): Promise<CloudSyncResult> {
  await ensureFirebaseAuth();
  const path = `schools/${schoolId}`;
  try {
    // 1. Fetch current school state from server
    const res = await fetch(`/api/school/export-data?school_id=${encodeURIComponent(schoolId)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to load school export from server: ${res.statusText}`);
    }

    const json = await res.json();
    const data = json.data;
    if (!data || !data.school) {
      throw new Error('School data is empty or corrupted.');
    }

    const now = new Date().toISOString();

    // 2. Persist main School Document in Firestore
    await setDoc(doc(db, 'schools', schoolId), {
      id: data.school.id,
      name: data.school.name,
      slug: data.school.slug,
      email: data.school.email,
      phone: data.school.phone || '',
      address: data.school.address || '',
      country: data.school.country || 'Nigeria',
      state: data.school.state || '',
      school_level: data.school.school_level,
      logo_url: data.school.logo_url || '',
      result_template_json: data.school.result_template_json || '',
      status: data.school.status || 'approved',
      updated_at: now
    }, { merge: true });

    // 3. Persist Students subcollection
    let studentCount = 0;
    const parentMap = new Map<string, any>();
    if (Array.isArray(data.students)) {
      for (const st of data.students) {
        await setDoc(doc(db, 'schools', schoolId, 'students', st.id), {
          id: st.id,
          school_id: schoolId,
          admission_number: st.admission_number,
          full_name: st.full_name,
          gender: st.gender || 'Male',
          class_id: st.class_id,
          arm_id: st.arm_id || '',
          parent_name: st.parent_name || '',
          parent_phone: st.parent_phone || '',
          parent_email: st.parent_email || '',
          enrollment_status: st.enrollment_status || 'active',
          created_at: st.created_at || now
        }, { merge: true });
        studentCount++;

        // Aggregate parent record if details exist
        if (st.parent_name && st.parent_name.trim()) {
          const parentKey = (st.parent_phone || st.parent_email || st.parent_name).trim().toLowerCase();
          if (!parentMap.has(parentKey)) {
            parentMap.set(parentKey, {
              id: 'parent_' + Math.abs(st.parent_name.split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)),
              school_id: schoolId,
              full_name: st.parent_name,
              phone: st.parent_phone || '',
              email: st.parent_email || '',
              relationship: 'Parent / Guardian',
              student_ids: st.id,
              created_at: now
            });
          }
        }
      }
    }

    // 4. Persist Teachers & School Staff subcollection
    let teacherCount = 0;
    if (Array.isArray(data.users)) {
      for (const u of data.users) {
        await setDoc(doc(db, 'schools', schoolId, 'users', u.id), {
          id: u.id,
          school_id: schoolId,
          email: u.email,
          full_name: u.full_name,
          role: u.role,
          phone: u.phone || '',
          status: 'active',
          created_at: u.created_at || now
        }, { merge: true });

        if (u.role === 'teacher') {
          await setDoc(doc(db, 'schools', schoolId, 'teachers', u.id), {
            id: u.id,
            school_id: schoolId,
            user_id: u.id,
            full_name: u.full_name,
            email: u.email,
            phone: u.phone || '',
            specialization: 'General Education',
            assigned_classes: '',
            created_at: u.created_at || now
          }, { merge: true });
          teacherCount++;
        }
      }
    }

    // 5. Persist Parents subcollection
    let parentCount = 0;
    for (const p of parentMap.values()) {
      await setDoc(doc(db, 'schools', schoolId, 'parents', p.id), p, { merge: true });
      parentCount++;
    }

    // 6. Persist Attendance Records subcollection
    let attendanceCount = 0;
    if (Array.isArray(data.attendance_records)) {
      for (const att of data.attendance_records) {
        await setDoc(doc(db, 'schools', schoolId, 'attendance', att.id), {
          id: att.id,
          school_id: schoolId,
          student_id: att.student_id,
          class_id: att.class_id,
          date: att.date,
          status: att.status || 'present',
          remarks: att.remarks || '',
          recorded_by_user_id: att.recorded_by_user_id || 'system',
          created_at: att.created_at || now
        }, { merge: true });
        attendanceCount++;
      }
    }

    // 7. Persist Fees Payments subcollection
    let feeCount = 0;
    if (Array.isArray(data.fee_payments)) {
      for (const fee of data.fee_payments) {
        await setDoc(doc(db, 'schools', schoolId, 'fees', fee.id), {
          id: fee.id,
          school_id: schoolId,
          student_id: fee.student_id,
          category_id: fee.category_id || '',
          amount_paid: Number(fee.amount_paid) || 0,
          payment_method: fee.payment_method || 'Cash',
          receipt_number: fee.receipt_number || ('REC-' + fee.id.slice(-6)),
          recorded_by_user_id: fee.recorded_by_user_id || 'bursar',
          payment_date: fee.payment_date || now,
          notes: fee.notes || ''
        }, { merge: true });
        feeCount++;
      }
    }

    // 8. Persist Student Examination & Assessment Scores subcollection
    let scoreCount = 0;
    if (Array.isArray(data.student_scores)) {
      for (const sc of data.student_scores) {
        await setDoc(doc(db, 'schools', schoolId, 'scores', sc.id), {
          id: sc.id,
          school_id: schoolId,
          student_id: sc.student_id,
          subject_id: sc.subject_id,
          class_id: sc.class_id,
          term_id: sc.term_id,
          session_id: sc.session_id,
          ca1: Number(sc.ca1) || 0,
          ca2: Number(sc.ca2) || 0,
          ca3: Number(sc.ca3) || 0,
          exam: Number(sc.exam) || 0,
          total: Number(sc.total) || 0,
          grade: sc.grade || 'F',
          remark: sc.remark || 'Fail',
          status: sc.status || 'draft',
          entered_by_user_id: sc.entered_by_user_id || 'system',
          updated_at: now
        }, { merge: true });
        scoreCount++;
      }
    }

    // 9. Persist Term Results subcollection
    let resultCount = 0;
    if (Array.isArray(data.term_results)) {
      for (const tr of data.term_results) {
        await setDoc(doc(db, 'schools', schoolId, 'term_results', tr.id), {
          id: tr.id,
          school_id: schoolId,
          student_id: tr.student_id,
          class_id: tr.class_id,
          term_id: tr.term_id,
          session_id: tr.session_id,
          total_score: Number(tr.total_score) || 0,
          average_score: Number(tr.average_score) || 0,
          position: Number(tr.position) || null,
          class_size: Number(tr.class_size) || 0,
          status: tr.status || 'draft',
          snapshot_json: tr.snapshot_json || '',
          updated_at: now
        }, { merge: true });
        resultCount++;
      }
    }

    // 10. Persist Cloud Backup Snapshot for Instant Recovery
    const totalRecords = studentCount + teacherCount + parentCount + attendanceCount + feeCount + scoreCount + resultCount + 1;
    await setDoc(doc(db, 'schools', schoolId, 'cloud_sync', 'latest'), {
      id: 'latest',
      school_id: schoolId,
      backup_timestamp: now,
      total_records: totalRecords,
      version: '1.0.0',
      payload_json: JSON.stringify(data)
    });

    return {
      success: true,
      timestamp: now,
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
      totalSynced: {
        students: studentCount,
        teachers: teacherCount,
        parents: parentCount,
        attendance: attendanceCount,
        fees: feeCount,
        scores: scoreCount,
        results: resultCount,
        subjects: Array.isArray(data.subjects) ? data.subjects.length : 0
      }
    };
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Checks Firestore to see if this school has an active cloud backup
 */
export async function getFirebaseSyncStatus(schoolId: string): Promise<CloudSyncStatus> {
  await ensureFirebaseAuth();
  const path = `schools/${schoolId}/cloud_sync/latest`;
  try {
    const snap = await getDoc(doc(db, 'schools', schoolId, 'cloud_sync', 'latest'));
    if (snap.exists()) {
      const data = snap.data();
      return {
        lastSyncTimestamp: data.backup_timestamp || null,
        totalRecords: Number(data.total_records) || 0,
        isSynced: true,
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId
      };
    }
    return {
      lastSyncTimestamp: null,
      totalRecords: 0,
      isSynced: false,
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId
    };
  } catch (err) {
    // If not found or error, return un-synced status safely
    return {
      lastSyncTimestamp: null,
      totalRecords: 0,
      isSynced: false,
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId
    };
  }
}

/**
 * Restores school state from Firestore Cloud snapshot to ensure 0 data loss
 */
export async function restoreSchoolFromFirestore(
  schoolId: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  await ensureFirebaseAuth();
  const path = `schools/${schoolId}/cloud_sync/latest`;
  try {
    const snap = await getDoc(doc(db, 'schools', schoolId, 'cloud_sync', 'latest'));
    if (!snap.exists()) {
      throw new Error('No cloud backup found in Firestore for this school.');
    }

    const cloudData = snap.data();
    if (!cloudData.payload_json) {
      throw new Error('Cloud backup payload is missing.');
    }

    const parsedData = JSON.parse(cloudData.payload_json);

    const res = await fetch('/api/school/import-cloud-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ schoolData: parsedData })
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to restore cloud data to server.');
    }

    return {
      success: true,
      message: `Restored successfully from Firestore backup dated ${new Date(cloudData.backup_timestamp).toLocaleString()}.`
    };
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

/**
 * Fetches all school documents present in Cloud Firestore
 */
export async function fetchAllFirestoreSchools(): Promise<any[]> {
  await ensureFirebaseAuth();
  const path = 'schools';
  try {
    const snapshot = await getDocs(collection(db, 'schools'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Could not query Firestore schools:', err);
    return [];
  }
}
