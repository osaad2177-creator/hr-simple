// src/services/leave.js
import {
  collection, addDoc, query, where, getDocs, doc, updateDoc,
  orderBy, serverTimestamp, getDoc, limit
} from 'firebase/firestore';
import { db } from './firebase';
import { differenceInBusinessDays } from 'date-fns';

export const LEAVE_TYPES = {
  annual: { label: 'Annual Leave', color: 'blue', defaultDays: 21 },
  sick: { label: 'Sick Leave', color: 'red', defaultDays: 10 },
  emergency: { label: 'Emergency Leave', color: 'orange', defaultDays: 5 },
  unpaid: { label: 'Unpaid Leave', color: 'gray', defaultDays: 0 },
};

export const submitLeaveRequest = async (userId, userName, leaveData) => {
  const { leaveType, startDate, endDate, reason, attachmentUrl } = leaveData;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = differenceInBusinessDays(end, start) + 1;

  if (days <= 0) throw new Error('End date must be after start date.');

  // Check for overlapping requests
  const existing = await getUserLeaveRequests(userId);
  const hasOverlap = existing.some(req => {
    if (req.status === 'rejected') return false;
    const rs = req.startDate?.toDate?.() || new Date(req.startDate);
    const re = req.endDate?.toDate?.() || new Date(req.endDate);
    return start <= re && end >= rs;
  });
  if (hasOverlap) throw new Error('You have an overlapping leave request for those dates.');

  const ref = await addDoc(collection(db, 'leave_requests'), {
    userId,
    userName,
    leaveType,
    startDate: start,
    endDate: end,
    days,
    reason,
    attachmentUrl: attachmentUrl || null,
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    reviewComment: '',
    createdAt: serverTimestamp(),
  });

  return { id: ref.id, days };
};

export const getUserLeaveRequests = async (userId) => {
  const q = query(
    collection(db, 'leave_requests'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAllLeaveRequests = async (status) => {
  let q;
  if (status && status !== 'all') {
    q = query(
      collection(db, 'leave_requests'),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
  } else {
    q = query(collection(db, 'leave_requests'), orderBy('createdAt', 'desc'), limit(200));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const reviewLeaveRequest = async (requestId, status, comment, reviewerId) => {
  await updateDoc(doc(db, 'leave_requests', requestId), {
    status,
    reviewComment: comment || '',
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
  });

  // If approved, deduct from leave balance
  if (status === 'approved') {
    const reqSnap = await getDoc(doc(db, 'leave_requests', requestId));
    const reqData = reqSnap.data();
    const userSnap = await getDoc(doc(db, 'users', reqData.userId));
    const userData = userSnap.data();
    const balance = userData.leaveBalance || {};
    const type = reqData.leaveType;
    if (type !== 'unpaid') {
      const current = balance[type] || 0;
      await updateDoc(doc(db, 'users', reqData.userId), {
        [`leaveBalance.${type}`]: Math.max(0, current - reqData.days),
      });
    }
  }
};

export const getLeaveBalance = async (userId) => {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return {};
  return snap.data().leaveBalance || {
    annual: 21,
    sick: 10,
    emergency: 5,
    unpaid: 999,
  };
};
