// Database types and utilities for Matrix Gaming Parlour Booking System

export type StationType = 'PC' | 'PS5';
export type StationStatus = 'Available' | 'Booked' | 'In Use' | 'Maintenance';
export type BookingStatus = 'Confirmed' | 'Checked In' | 'Completed' | 'Cancelled' | 'No Show';
export type PaymentStatus = 'Pending' | 'Paid';
export type PaymentMethod = 'Cash' | 'UPI';

export interface Station {
  id: string;
  name: string;
  type: StationType;
  hourlyRate: number;
  status: StationStatus; // current real-time status
}

export interface SessionSegment {
  id: string;
  stationId: string;
  stationName: string;
  stationType: StationType;
  hourlyRate: number;
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationHours: number;
  numControllers: number; // 1 for PC, 1-4 for PS5
  amount: number;
}

export interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  stationId: string; // original/current station
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM (scheduled)
  scheduledEndTime: string; // HH:MM
  actualStartTime: string | null; // ISO string
  actualEndTime: string | null; // ISO string
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  estimatedAmount: number;
  finalAmount: number | null;
  notes: string;
  createdAt: string; // ISO string
  numControllers: number; // 1 for PC, 1-4 for PS5
  segments: SessionSegment[]; // Detail history of play (for extension/swapping)
}

// Initial Seed Data
const DEFAULT_STATIONS: Station[] = [
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `pc_${i + 1}`,
    name: `PC ${i + 1}`,
    type: 'PC' as const,
    hourlyRate: 120,
    status: 'Available' as const,
  })),
  {
    id: 'ps5_1',
    name: 'PS5 Station',
    type: 'PS5',
    hourlyRate: 90,
    status: 'Available',
  },
];

// Helper: Get all stations
export function getStations(): Station[] {
  const data = localStorage.getItem('mtx_stations');
  if (!data) {
    localStorage.setItem('mtx_stations', JSON.stringify(DEFAULT_STATIONS));
    return DEFAULT_STATIONS;
  }
  return JSON.parse(data);
}

// Helper: Save stations
export function saveStations(stations: Station[]): void {
  localStorage.setItem('mtx_stations', JSON.stringify(stations));
}

// Helper: Update a single station status (Maintenance, etc.)
export function updateStationStatus(id: string, status: StationStatus): void {
  const stations = getStations();
  const index = stations.findIndex(s => s.id === id);
  if (index !== -1) {
    stations[index].status = status;
    saveStations(stations);
  }
}

// Helper: Get all bookings
export function getBookings(): Booking[] {
  const data = localStorage.getItem('mtx_bookings');
  if (!data) {
    localStorage.setItem('mtx_bookings', JSON.stringify([]));
    return [];
  }
  return JSON.parse(data);
}

// Helper: Save bookings
export function saveBookings(bookings: Booking[]): void {
  localStorage.setItem('mtx_bookings', JSON.stringify(bookings));
}

// Helper: Generate a unique ID (MTX-XXXXX)
export function generateBookingId(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `MTX-${num}`;
}

// Helper: Check if a station is available for a given slot
// Date: YYYY-MM-DD
// StartTime: HH:MM
// Duration: number of hours (fractional allowed)
// ExcludeBookingId: skip check for this booking (used in rescheduling)
export function isStationAvailable(
  stationId: string,
  date: string,
  startTime: string,
  durationHours: number,
  excludeBookingId?: string
): boolean {
  // Check maintenance first
  const stations = getStations();
  const station = stations.find(s => s.id === stationId);
  if (!station || station.status === 'Maintenance') {
    return false;
  }

  const bookings = getBookings();

  // Convert proposed slot to numerical minutes since start of day
  const [startH, startM] = startTime.split(':').map(Number);
  const proposedStart = startH * 60 + startM;
  // Calculate exact minutes and round to avoid floating issues
  const proposedEnd = Math.round(proposedStart + durationHours * 60);

  // Filter overlapping bookings on the same station and same date
  const conflicting = bookings.filter(b => {
    if (b.stationId !== stationId) return false;
    if (b.bookingDate !== date) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    // Don't conflict with Cancelled or No Show bookings
    if (b.status === 'Cancelled' || b.status === 'No Show') return false;

    // Convert existing booking to numerical minutes
    const [bStartH, bStartM] = b.startTime.split(':').map(Number);
    const [bEndH, bEndM] = b.scheduledEndTime.split(':').map(Number);
    const bStart = bStartH * 60 + bStartM;
    const bEnd = bEndH * 60 + bEndM;

    // Standard overlap check: Max(start1, start2) < Min(end1, end2)
    return Math.max(proposedStart, bStart) < Math.min(proposedEnd, bEnd);
  });

  return conflicting.length === 0;
}

// Helper: Calculate Scheduled End Time
export function calculateEndTime(startTime: string, durationHours: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const totalMinutes = Math.round(h * 60 + m + durationHours * 60);
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

// Helper: Phone verification for India (10 digits, starts with 6-9)
export function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return /^[6-9]\d{9}$/.test(cleaned);
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return /^[6-9]\d{9}$/.test(cleaned.substring(2));
  }
  return false;
}

// Helper: Format price to Rupees
export function formatRupees(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Create a new booking (Guest Booking)
export function createBooking(bookingData: {
  customerName: string;
  customerPhone: string;
  stationId: string;
  bookingDate: string;
  startTime: string;
  durationHours: number;
  notes: string;
  numControllers?: number;
}): Booking | string {
  const stations = getStations();
  const station = stations.find(s => s.id === bookingData.stationId);
  if (!station) {
    return 'Invalid station selected.';
  }

  if (station.status === 'Maintenance') {
    return 'This station is currently under maintenance.';
  }

  // Validate phone number
  if (!isValidIndianPhone(bookingData.customerPhone)) {
    return 'Please enter a valid 10-digit Indian mobile number.';
  }

  // Check overlap
  const available = isStationAvailable(
    bookingData.stationId,
    bookingData.bookingDate,
    bookingData.startTime,
    bookingData.durationHours
  );

  if (!available) {
    return 'The selected station is already booked for this time slot. Please select a different station or time.';
  }

  const controllers = station.type === 'PS5' ? Math.max(1, Math.min(4, bookingData.numControllers || 1)) : 1;
  const rate = station.type === 'PS5' ? station.hourlyRate * controllers : station.hourlyRate;
  
  // Calculate price based on duration hours (minutes proportion)
  const estimatedAmount = Math.round(rate * bookingData.durationHours);
  
  const scheduledEndTime = calculateEndTime(bookingData.startTime, bookingData.durationHours);
  const bookingId = generateBookingId();

  // Create initial segment representing the scheduled slot
  const initialSegment: SessionSegment = {
    id: `${bookingId}_seg_1`,
    stationId: station.id,
    stationName: station.name,
    stationType: station.type,
    hourlyRate: station.hourlyRate,
    startTime: new Date(`${bookingData.bookingDate}T${bookingData.startTime}:00`).toISOString(),
    endTime: new Date(`${bookingData.bookingDate}T${scheduledEndTime}:00`).toISOString(),
    durationHours: bookingData.durationHours,
    numControllers: controllers,
    amount: estimatedAmount,
  };

  const newBooking: Booking = {
    id: bookingId,
    customerName: bookingData.customerName.trim(),
    customerPhone: bookingData.customerPhone.trim(),
    stationId: bookingData.stationId,
    bookingDate: bookingData.bookingDate,
    startTime: bookingData.startTime,
    scheduledEndTime,
    actualStartTime: null,
    actualEndTime: null,
    status: 'Confirmed',
    paymentStatus: 'Pending',
    paymentMethod: null,
    estimatedAmount,
    finalAmount: null,
    notes: bookingData.notes.trim(),
    createdAt: new Date().toISOString(),
    numControllers: controllers,
    segments: [initialSegment],
  };

  const bookings = getBookings();
  bookings.push(newBooking);
  saveBookings(bookings);

  // Update station status to Booked if the booking is for right now
  syncCurrentStationStates();

  return newBooking;
}

// Synchronize station status based on actual current time bookings
export function syncCurrentStationStates(): void {
  const stations = getStations();
  const bookings = getBookings();
  const now = new Date();

  // Reset all stations that are not in maintenance
  stations.forEach(s => {
    if (s.status !== 'Maintenance') {
      s.status = 'Available';
    }
  });

  bookings.forEach(b => {
    if (b.status === 'Cancelled' || b.status === 'No Show' || b.status === 'Completed') {
      return;
    }

    const station = stations.find(s => s.id === b.stationId);
    if (!station || station.status === 'Maintenance') return;

    if (b.status === 'Checked In') {
      station.status = 'In Use';
    } else if (b.status === 'Confirmed') {
      // Parse scheduled booking window
      const startDateTime = new Date(`${b.bookingDate}T${b.startTime}:00`);
      const endDateTime = new Date(`${b.bookingDate}T${b.scheduledEndTime}:00`);
      
      // If now is within scheduled window, or within 15 minutes prior (buffer)
      const leadTimeMs = 15 * 60 * 1000;
      if (now >= new Date(startDateTime.getTime() - leadTimeMs) && now <= endDateTime) {
        station.status = 'Booked';
      }
    }
  });

  saveStations(stations);
}

// Helper: 4-Tier Timing Priority Rules & Effective Session Timing Calculator
export interface EffectiveSessionTiming {
  effectiveStartISO: string;
  effectiveEndISO: string;
  durationMinutes: number;
  durationHours: number;
  timingSource: string;
  priority: 1 | 2 | 3 | 4;
  isFallback: boolean;
  scheduledDurationHours: number;
  actualDurationHours: number | null;
  estimatedOrFinalAmount: number;
}

export function getEffectiveSessionTiming(booking: Booking, nowISO: string = new Date().toISOString()): EffectiveSessionTiming {
  const schedStartISO = new Date(`${booking.bookingDate}T${booking.startTime}:00`).toISOString();
  const schedEndISO = new Date(`${booking.bookingDate}T${booking.scheduledEndTime}:00`).toISOString();

  let effectiveStartISO: string;
  let effectiveEndISO: string;
  let priority: 1 | 2 | 3 | 4;
  let timingSource: string;
  let isFallback: boolean;

  const hasActualStart = Boolean(booking.actualStartTime);
  const hasActualEnd = Boolean(booking.actualEndTime);

  if (hasActualStart && hasActualEnd) {
    priority = 1;
    effectiveStartISO = booking.actualStartTime!;
    effectiveEndISO = booking.actualEndTime!;
    timingSource = 'Actual Time (Check-In & Check-Out)';
    isFallback = false;
  } else if (hasActualStart && !hasActualEnd) {
    priority = 2;
    effectiveStartISO = booking.actualStartTime!;
    effectiveEndISO = booking.status === 'Completed' ? schedEndISO : nowISO;
    timingSource = 'Actual Check-In + Scheduled End Time (Fallback)';
    isFallback = true;
  } else if (!hasActualStart && hasActualEnd) {
    priority = 3;
    effectiveStartISO = schedStartISO;
    effectiveEndISO = booking.actualEndTime!;
    timingSource = 'Scheduled Start Time (Fallback) + Actual Check-Out';
    isFallback = true;
  } else {
    priority = 4;
    effectiveStartISO = schedStartISO;
    effectiveEndISO = schedEndISO;
    timingSource = 'Scheduled Time (Fallback — Admin timing not recorded)';
    isFallback = true;
  }

  const startMs = new Date(effectiveStartISO).getTime();
  const endMs = new Date(effectiveEndISO).getTime();
  const diffMs = Math.max(0, endMs - startMs);
  const durationMinutes = Math.round(diffMs / 60000);
  const durationHours = Number((durationMinutes / 60).toFixed(2));

  const schedStartMs = new Date(schedStartISO).getTime();
  const schedEndMs = new Date(schedEndISO).getTime();
  const scheduledDurationHours = Number(((schedEndMs - schedStartMs) / 3600000).toFixed(2));

  let actualDurationHours: number | null = null;
  if (hasActualStart && hasActualEnd) {
    actualDurationHours = Number(((new Date(booking.actualEndTime!).getTime() - new Date(booking.actualStartTime!).getTime()) / 3600000).toFixed(2));
  }

  const firstSeg = booking.segments[0];
  const stationType = firstSeg ? firstSeg.stationType : 'PC';
  const hourlyRate = firstSeg ? firstSeg.hourlyRate : 120;
  const numControllers = booking.numControllers || 1;
  const rateFactor = stationType === 'PS5' ? numControllers * hourlyRate : hourlyRate;

  const estimatedOrFinalAmount = Math.round(durationHours * rateFactor);

  return {
    effectiveStartISO,
    effectiveEndISO,
    durationMinutes,
    durationHours,
    timingSource,
    priority,
    isFallback,
    scheduledDurationHours,
    actualDurationHours,
    estimatedOrFinalAmount,
  };
}

// Action: Check In Customer
export function checkInBooking(id: string, customActualStartTime?: string): Booking | string {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return 'Booking not found.';

  const booking = bookings[index];
  if (booking.status !== 'Confirmed') {
    return `Cannot check in from status: ${booking.status}`;
  }

  const nowISO = customActualStartTime || new Date().toISOString();
  booking.status = 'Checked In';
  booking.actualStartTime = nowISO;

  // Update initial segment's start time to the actual start time
  if (booking.segments.length > 0) {
    booking.segments[0].startTime = nowISO;
    const duration = booking.segments[0].durationHours;
    const end = new Date(new Date(nowISO).getTime() + duration * 60 * 60 * 1000);
    booking.segments[0].endTime = end.toISOString();
  }

  bookings[index] = booking;
  saveBookings(bookings);
  syncCurrentStationStates();

  return booking;
}

// Action: Update / Correct Check-In Time
export function updateCheckInTime(id: string, newCheckInISO: string): Booking | string {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return 'Booking not found.';

  const booking = bookings[index];
  booking.actualStartTime = newCheckInISO;
  if (booking.segments.length > 0) {
    booking.segments[0].startTime = newCheckInISO;
  }

  bookings[index] = booking;
  saveBookings(bookings);
  syncCurrentStationStates();

  return booking;
}

// Action: Extend/Add segment (Station Switch or Duration Extension)
export function extendOrSwapStation(
  bookingId: string,
  newStationId: string,
  additionalHours: number,
  numControllers?: number
): Booking | string {
  const bookings = getBookings();
  const bIndex = bookings.findIndex(b => b.id === bookingId);
  if (bIndex === -1) return 'Booking not found.';

  const booking = bookings[bIndex];
  if (booking.status !== 'Checked In') {
    return 'Only active checked-in sessions can be extended or swapped.';
  }

  const stations = getStations();
  const targetStation = stations.find(s => s.id === newStationId);
  if (!targetStation) return 'Target station not found.';
  if (targetStation.status === 'Maintenance') return 'Target station is under maintenance.';

  const now = new Date();
  
  // Get the last segment
  const lastSeg = booking.segments[booking.segments.length - 1];
  const lastSegEnd = new Date(lastSeg.endTime);
  
  // Decide starting time of new segment
  const start = newStationId === lastSeg.stationId ? (now > lastSegEnd ? now : lastSegEnd) : now;
  const end = new Date(start.getTime() + additionalHours * 60 * 60 * 1000);

  // Overlap check for the target station
  const dateStr = start.toISOString().split('T')[0];
  const startHH = String(start.getHours()).padStart(2, '0');
  const startMM = String(start.getMinutes()).padStart(2, '0');
  const startTimeStr = `${startHH}:${startMM}`;

  const isTargetAvailable = isStationAvailable(
    newStationId,
    dateStr,
    startTimeStr,
    additionalHours,
    booking.id
  );

  if (!isTargetAvailable) {
    return `The station ${targetStation.name} is not available for the requested extension period.`;
  }

  // If station changed, close the last segment at "now"
  if (newStationId !== lastSeg.stationId) {
    if (now < lastSegEnd) {
      lastSeg.endTime = now.toISOString();
      const diffMs = now.getTime() - new Date(lastSeg.startTime).getTime();
      const diffHrs = Math.max(0.05, Number((diffMs / (1000 * 60 * 60)).toFixed(4)));
      lastSeg.durationHours = diffHrs;
      
      const rateFactor = lastSeg.stationType === 'PS5' ? lastSeg.numControllers : 1;
      lastSeg.amount = Math.round(diffHrs * lastSeg.hourlyRate * rateFactor);
    }
    booking.stationId = newStationId;
  }

  const controllers = targetStation.type === 'PS5' 
    ? Math.max(1, Math.min(4, numControllers !== undefined ? numControllers : (booking.numControllers || 1)))
    : 1;

  const targetRate = targetStation.type === 'PS5' ? targetStation.hourlyRate * controllers : targetStation.hourlyRate;
  const amount = Math.round(targetRate * additionalHours);

  // Create and push new segment
  const newSegment: SessionSegment = {
    id: `${booking.id}_seg_${booking.segments.length + 1}`,
    stationId: targetStation.id,
    stationName: targetStation.name,
    stationType: targetStation.type,
    hourlyRate: targetStation.hourlyRate,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    durationHours: additionalHours,
    numControllers: controllers,
    amount,
  };

  booking.segments.push(newSegment);
  booking.numControllers = controllers;
  
  const finalEnd = new Date(booking.segments[booking.segments.length - 1].endTime);
  const endH = String(finalEnd.getHours()).padStart(2, '0');
  const endM = String(finalEnd.getMinutes()).padStart(2, '0');
  booking.scheduledEndTime = `${endH}:${endM}`;
  
  booking.estimatedAmount = Math.round(booking.segments.reduce((sum, seg) => sum + seg.amount, 0));

  bookings[bIndex] = booking;
  saveBookings(bookings);
  syncCurrentStationStates();

  return booking;
}

// Action: Check Out / Complete Booking
export function checkOutBooking(
  id: string,
  paymentMethod: PaymentMethod,
  customFinalAmount?: number,
  customActualEndTime?: string
): Booking | string {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return 'Booking not found.';

  const booking = bookings[index];
  if (booking.status !== 'Checked In' && booking.status !== 'Confirmed') {
    return `Cannot check out from status: ${booking.status}`;
  }

  const nowISO = customActualEndTime || new Date().toISOString();
  booking.status = 'Completed';
  booking.actualEndTime = nowISO;

  // Calculate session bill using effective timing fallback priority
  const timing = getEffectiveSessionTiming(booking, nowISO);

  // Recalculate last segment amount
  const lastSeg = booking.segments[booking.segments.length - 1];
  if (lastSeg) {
    lastSeg.endTime = timing.effectiveEndISO;
    lastSeg.durationHours = timing.durationHours;
    const rateFactor = lastSeg.stationType === 'PS5' ? lastSeg.numControllers : 1;
    lastSeg.amount = Math.round(timing.durationHours * lastSeg.hourlyRate * rateFactor);
  }

  const calculatedTotal = booking.segments.reduce((sum, seg) => sum + seg.amount, 0);

  booking.finalAmount = customFinalAmount !== undefined ? customFinalAmount : Math.round(calculatedTotal);
  booking.paymentStatus = 'Paid';
  booking.paymentMethod = paymentMethod;

  bookings[index] = booking;
  saveBookings(bookings);
  syncCurrentStationStates();

  return booking;
}

// Action: Cancel Booking
export function cancelBooking(id: string): Booking | string {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return 'Booking not found.';

  const booking = bookings[index];
  if (booking.status === 'Completed' || booking.status === 'Checked In') {
    return `Cannot cancel a booking that is ${booking.status}`;
  }

  booking.status = 'Cancelled';
  bookings[index] = booking;
  saveBookings(bookings);
  syncCurrentStationStates();

  return booking;
}

// Action: Reschedule Booking
export function rescheduleBooking(
  id: string,
  newDate: string,
  newStartTime: string,
  newDurationHours: number,
  newNumControllers?: number
): Booking | string {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return 'Booking not found.';

  const booking = bookings[index];
  if (booking.status !== 'Confirmed') {
    return 'Only confirmed upcoming bookings can be rescheduled.';
  }

  const available = isStationAvailable(
    booking.stationId,
    newDate,
    newStartTime,
    newDurationHours,
    booking.id
  );

  if (!available) {
    return 'The station is unavailable at the selected date and time.';
  }

  const stations = getStations();
  const station = stations.find(s => s.id === booking.stationId);
  const hourlyRate = station ? station.hourlyRate : 120;
  
  const controllers = station?.type === 'PS5' 
    ? Math.max(1, Math.min(4, newNumControllers !== undefined ? newNumControllers : booking.numControllers)) 
    : 1;

  const scheduledEndTime = calculateEndTime(newStartTime, newDurationHours);
  const rate = station?.type === 'PS5' ? hourlyRate * controllers : hourlyRate;
  const estimatedAmount = Math.round(rate * newDurationHours);

  const updatedSegment: SessionSegment = {
    id: `${booking.id}_seg_1`,
    stationId: booking.stationId,
    stationName: station ? station.name : 'Unknown Station',
    stationType: station ? station.type : 'PC',
    hourlyRate,
    startTime: new Date(`${newDate}T${newStartTime}:00`).toISOString(),
    endTime: new Date(`${newDate}T${scheduledEndTime}:00`).toISOString(),
    durationHours: newDurationHours,
    numControllers: controllers,
    amount: estimatedAmount,
  };

  booking.bookingDate = newDate;
  booking.startTime = newStartTime;
  booking.scheduledEndTime = scheduledEndTime;
  booking.estimatedAmount = estimatedAmount;
  booking.numControllers = controllers;
  booking.segments = [updatedSegment];

  bookings[index] = booking;
  saveBookings(bookings);
  syncCurrentStationStates();

  return booking;
}

// Action: Mark booking as No Show
export function markAsNoShow(id: string): Booking | string {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return 'Booking not found.';

  const booking = bookings[index];
  if (booking.status !== 'Confirmed') {
    return 'Only confirmed upcoming bookings can be marked as No Show.';
  }

  booking.status = 'No Show';
  bookings[index] = booking;
  saveBookings(bookings);
  syncCurrentStationStates();

  return booking;
}

// Get WhatsApp Click-to-Chat Link and Message Text
export function getWhatsAppConfirmation(booking: Booking): { link: string; text: string } {
  const totalHrs = booking.segments.reduce((sum, s) => sum + s.durationHours, 0);
  const hrs = Math.floor(totalHrs);
  const mins = Math.round((totalHrs - hrs) * 60);
  const durationText = hrs > 0 ? `${hrs}h ${mins > 0 ? mins + 'm' : ''}` : `${mins}m`;

  const controllerText = booking.segments[0].stationType === 'PS5' 
    ? `\n*Controllers:* ${booking.numControllers} Controllers` 
    : '';

  const text = `🎮 *Matrix Gaming Booking Confirmed!*

*Booking ID:* ${booking.id}
*Station:* ${booking.segments[0].stationName}${controllerText}
*Date:* ${booking.bookingDate}
*Time:* ${booking.startTime}
*Duration:* ${durationText} (${booking.startTime} - ${booking.scheduledEndTime})
*Estimated Amount:* ₹${booking.estimatedAmount}

Please arrive on time. Payment can be made after your gaming session via Cash or UPI.

Thank you for choosing *Matrix Gaming!* 🎮`;

  const phone = booking.customerPhone.replace(/\D/g, '');
  const prefix = phone.startsWith('91') && phone.length === 12 ? '' : '91';
  const encodedText = encodeURIComponent(text);
  const link = `https://wa.me/${prefix}${phone}?text=${encodedText}`;

  return { link, text };
}

// Initialize database with some sample bookings if it is empty
export function seedSampleBookings(): void {
  const bookings = getBookings();
  if (bookings.length > 0) return;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Seed sample completed booking (Yesterday) - 2.5 hours on PC 1
  const sample1: Booking = {
    id: 'MTX-58210',
    customerName: 'Aarav Sharma',
    customerPhone: '9876543210',
    stationId: 'pc_1',
    bookingDate: yesterday,
    startTime: '14:00',
    scheduledEndTime: '16:30',
    actualStartTime: new Date(`${yesterday}T14:02:00`).toISOString(),
    actualEndTime: new Date(`${yesterday}T16:32:00`).toISOString(),
    status: 'Completed',
    paymentStatus: 'Paid',
    paymentMethod: 'UPI',
    estimatedAmount: 300,
    finalAmount: 300,
    notes: 'Likes high DPI mouse settings',
    createdAt: new Date(`${yesterday}T10:00:00`).toISOString(),
    numControllers: 1,
    segments: [
      {
        id: 'MTX-58210_seg_1',
        stationId: 'pc_1',
        stationName: 'PC 1',
        stationType: 'PC',
        hourlyRate: 120,
        startTime: new Date(`${yesterday}T14:02:00`).toISOString(),
        endTime: new Date(`${yesterday}T16:32:00`).toISOString(),
        durationHours: 2.5,
        numControllers: 1,
        amount: 300,
      },
    ],
  };

  // Seed sample Checked In (Active right now) - 1.5 hours on PC 2
  const sample2: Booking = {
    id: 'MTX-11234',
    customerName: 'Aditya Verma',
    customerPhone: '9988776655',
    stationId: 'pc_2',
    bookingDate: today,
    startTime: '18:00',
    scheduledEndTime: '19:30',
    actualStartTime: new Date().toISOString(),
    actualEndTime: null,
    status: 'Checked In',
    paymentStatus: 'Pending',
    paymentMethod: null,
    estimatedAmount: 180,
    finalAmount: null,
    notes: '',
    createdAt: new Date().toISOString(),
    numControllers: 1,
    segments: [
      {
        id: 'MTX-11234_seg_1',
        stationId: 'pc_2',
        stationName: 'PC 2',
        stationType: 'PC',
        hourlyRate: 120,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(),
        durationHours: 1.5,
        numControllers: 1,
        amount: 180,
      },
    ],
  };

  // Seed sample Confirmed (Later today) - PS5 with 2 Controllers for 2 hours
  const sample3: Booking = {
    id: 'MTX-94821',
    customerName: 'Rohan Gupta',
    customerPhone: '8877665544',
    stationId: 'ps5_1',
    bookingDate: today,
    startTime: '21:00',
    scheduledEndTime: '23:00',
    actualStartTime: null,
    actualEndTime: null,
    status: 'Confirmed',
    paymentStatus: 'Pending',
    paymentMethod: null,
    estimatedAmount: 360, // 2 controllers * 2 hours * 90 = 360
    finalAmount: null,
    notes: 'Bring an extra controller if possible',
    createdAt: new Date().toISOString(),
    numControllers: 2,
    segments: [
      {
        id: 'MTX-94821_seg_1',
        stationId: 'ps5_1',
        stationName: 'PS5 Station',
        stationType: 'PS5',
        hourlyRate: 90,
        startTime: new Date(`${today}T21:00:00`).toISOString(),
        endTime: new Date(`${today}T23:00:00`).toISOString(),
        durationHours: 2,
        numControllers: 2,
        amount: 360,
      },
    ],
  };

  // Seed sample Cancelled (Today)
  const sample4: Booking = {
    id: 'MTX-73829',
    customerName: 'Priya Patel',
    customerPhone: '7766554433',
    stationId: 'pc_3',
    bookingDate: today,
    startTime: '10:00',
    scheduledEndTime: '11:15',
    actualStartTime: null,
    actualEndTime: null,
    status: 'Cancelled',
    paymentStatus: 'Pending',
    paymentMethod: null,
    estimatedAmount: 150, // 1.25 hours = 150
    finalAmount: null,
    notes: 'Rescheduled elsewhere',
    createdAt: new Date().toISOString(),
    numControllers: 1,
    segments: [
      {
        id: 'MTX-73829_seg_1',
        stationId: 'pc_3',
        stationName: 'PC 3',
        stationType: 'PC',
        hourlyRate: 120,
        startTime: new Date(`${today}T10:00:00`).toISOString(),
        endTime: new Date(`${today}T11:15:00`).toISOString(),
        durationHours: 1.25,
        numControllers: 1,
        amount: 150,
      },
    ],
  };

  saveBookings([sample1, sample2, sample3, sample4]);
  syncCurrentStationStates();
}
