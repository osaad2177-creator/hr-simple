// src/services/attendance.js
import {
  collection, addDoc, query, where, getDocs, doc, updateDoc,
  orderBy, limit, serverTimestamp, Timestamp, getDoc
} from 'firebase/firestore';
import { db } from './firebase';

export const getGeolocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error('Location permission denied. Please allow location access.')),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

export const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

export const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  const isMobile = /Mobi|Android/i.test(ua);
  return { browser, device: isMobile ? 'Mobile' : 'Desktop', userAgent: ua.slice(0, 200) };
};

export const getTodayAttendance = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const q = query(
    collection(db, 'attendance_logs'),
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(today)),
    where('date', '<', Timestamp.fromDate(tomorrow)),
    orderBy('date', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

export const checkIn = async (userId, userName, userDept) => {
  const existing = await getTodayAttendance(userId);
  if (existing && existing.checkInTime && !existing.checkOutTime) {
    throw new Error('You have already checked in. Please check out first.');
  }

  const location = await getGeolocation();
  const address = await reverseGeocode(location.lat, location.lng);
  const device = getDeviceInfo();
  const now = new Date();
  const workStart = new Date(now);
  workStart.setHours(9, 0, 0, 0);
  const isLate = now > workStart;

  const log = {
    userId,
    userName,
    department: userDept || '',
    date: serverTimestamp(),
    checkInTime: serverTimestamp(),
    checkOutTime: null,
    checkInLocation: location,
    checkInAddress: address,
    checkOutLocation: null,
    checkOutAddress: null,
    device,
    status: isLate ? 'late' : 'on-time',
    workHours: null,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'attendance_logs'), log);
  return { id: ref.id, ...log, date: now, checkInTime: now };
};

export const checkOut = async (userId) => {
  const existing = await getTodayAttendance(userId);
  if (!existing) throw new Error('No active check-in found for today.');
  if (existing.checkOutTime) throw new Error('You have already checked out today.');

  const location = await getGeolocation();
  const address = await reverseGeocode(location.lat, location.lng);
  const now = new Date();
  const checkInTime = existing.checkInTime?.toDate?.() || new Date();
  const workHours = ((now - checkInTime) / 3600000).toFixed(2);

  await updateDoc(doc(db, 'attendance_logs', existing.id), {
    checkOutTime: serverTimestamp(),
    checkOutLocation: location,
    checkOutAddress: address,
    workHours: parseFloat(workHours),
    status: existing.status === 'late' ? 'late' : 'complete',
  });

  return { ...existing, checkOutTime: now, workHours: parseFloat(workHours) };
};

export const getAttendanceHistory = async (userId, limitCount = 30) => {
  const q = query(
    collection(db, 'attendance_logs'),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAllTodayAttendance = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const q = query(
    collection(db, 'attendance_logs'),
    where('date', '>=', Timestamp.fromDate(today)),
    where('date', '<', Timestamp.fromDate(tomorrow))
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAttendanceByDateRange = async (userId, startDate, endDate) => {
  const q = query(
    collection(db, 'attendance_logs'),
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAllAttendanceLogs = async (startDate, endDate) => {
  let q;
  if (startDate && endDate) {
    q = query(
      collection(db, 'attendance_logs'),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
  } else {
    q = query(collection(db, 'attendance_logs'), orderBy('date', 'desc'), limit(200));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
