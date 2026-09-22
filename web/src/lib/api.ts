// Couche d'accès à l'API. Cookies HttpOnly => credentials: 'include'.
// Rafraîchit le token une fois automatiquement sur un 401.

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const BASE = '/api';

async function req<T = any>(path: string, opts: RequestInit = {}, retried = false): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    const r = await fetch(BASE + '/auth/refresh', { method: 'POST', credentials: 'include' });
    if (r.ok) return req<T>(path, opts, true);
  }

  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(' · ') : data?.message;
    throw new ApiError(res.status, msg || 'Une erreur est survenue.');
  }
  return data as T;
}

// ---- Types ----
export type Me = {
  id: string;
  email: string;
  role: 'VOLUNTEER' | 'ADMIN';
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    isMinor: boolean;
    hasPhoto: boolean;
    validationStatus: 'PENDING' | 'VALIDATED';
    planningStatus: 'DRAFT' | 'VALIDATED';
  } | null;
};

export type SlotState = 'MINE' | 'GREEN' | 'ORANGE' | 'FULL' | 'UNAVAILABLE';

export type MissionSlot = {
  missionSlotId: string;
  missionId: string;
  missionName: string;
  location: string | null;
  capacity: number;
  remaining: number;
  state: SlotState;
  bookedByMe: boolean;
  bookingId: string | null;
  reservable: boolean;
  reason: string | null;
};

export type Availability = {
  edition: { id: string; minSlots: number; maxSlots: number; windowOpen: boolean };
  planningStatus: 'DRAFT' | 'VALIDATED';
  myBookingsCount: number;
  days: {
    id: string;
    label: string;
    date: string;
    slots: {
      timeSlotId: string;
      indexInDay: number;
      startTime: string;
      endTime: string;
      missions: MissionSlot[];
    }[];
  }[];
};

export type MyPlanning = {
  planningStatus: 'DRAFT' | 'VALIDATED';
  count: number;
  items: {
    bookingId: string;
    status: string;
    mission: string;
    location: string | null;
    day: string;
    date: string;
    indexInDay: number;
    startTime: string;
    endTime: string;
  }[];
};

export const api = {
  verifyInvite: (code: string) =>
    req<{ valid: boolean; editionId: string | null }>('/auth/verify-invite', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  register: (dto: {
    code: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  }) => req<Me>('/auth/register', { method: 'POST', body: JSON.stringify(dto) }),
  login: (email: string, password: string) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => req('/auth/logout', { method: 'POST' }),
  me: () => req<Me>('/auth/me'),
  planning: () => req<Availability>('/planning'),
  myPlanning: () => req<MyPlanning>('/planning/me'),
  book: (missionSlotId: string) =>
    req('/planning/book', { method: 'POST', body: JSON.stringify({ missionSlotId }) }),
  unbook: (bookingId: string) => req('/planning/book/' + bookingId, { method: 'DELETE' }),
  validate: () => req<{ ok: boolean; validatedSlots: number }>('/planning/validate', { method: 'POST' }),
  uploadPhoto: async (file: File) => {
    const fd = new FormData();
    fd.append('photo', file);
    const send = () => fetch(BASE + '/photos/me', { method: 'POST', credentials: 'include', body: fd });
    let res = await send();
    if (res.status === 401) {
      const r = await fetch(BASE + '/auth/refresh', { method: 'POST', credentials: 'include' });
      if (r.ok) res = await send();
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = Array.isArray(data?.message) ? data.message.join(' · ') : data?.message;
      throw new ApiError(res.status, msg || "Envoi de la photo impossible.");
    }
    return data;
  },
  // URL de la photo du bénévole connecté (avec anti-cache).
  myPhotoUrl: (bust?: string | number) => `${BASE}/photos/me${bust ? `?v=${bust}` : ''}`,
  // URL de téléchargement du badge (GET avec cookie).
  myBadgeUrl: () => `${BASE}/badges/me`,
  verifyBadge: (token: string) =>
    req<BadgeVerification>('/badges/verify/' + encodeURIComponent(token)),
  verifyPhotoUrl: (token: string) => `${BASE}/badges/verify/${encodeURIComponent(token)}/photo`,
};

// ---- Admin ----
export type AdminStats = {
  totalVolunteers: number;
  planningValidated: number;
  planningDraft: number;
  minorsPending: number;
  fillRate: number;
  capacityTotal: number;
  takenTotal: number;
  perDay: { label: string; capacity: number; taken: number; rate: number }[];
  perMission: { name: string; capacity: number; taken: number; rate: number }[];
  understaffed: { day: string; time: string; mission: string; capacity: number; taken: number; remaining: number }[];
};
export type AdminMeta = {
  days: { id: string; label: string }[];
  missions: { id: string; name: string; isPublic: boolean }[];
};
export type VolunteerRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isMinor: boolean;
  hasPhoto: boolean;
  validationStatus: 'PENDING' | 'VALIDATED';
  planningStatus: 'DRAFT' | 'VALIDATED';
  bookingsCount: number;
};
export type VolunteerList = {
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  items: VolunteerRow[];
};
export type VolunteerDetail = VolunteerRow & {
  userId: string;
  bookings: {
    bookingId: string;
    mission: string;
    isPublic: boolean;
    day: string;
    startTime: string;
    endTime: string;
  }[];
};
export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

function qs(params: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') u.set(k, String(v));
  const s = u.toString();
  return s ? '?' + s : '';
}

export const admin = {
  stats: () => req<AdminStats>('/admin/stats'),
  meta: () => req<AdminMeta>('/admin/meta'),
  volunteers: (p: Record<string, string | number | undefined>) =>
    req<VolunteerList>('/admin/volunteers' + qs(p)),
  detail: (id: string) => req<VolunteerDetail>('/admin/volunteers/' + id),
  update: (id: string, dto: Record<string, unknown>) =>
    req('/admin/volunteers/' + id, { method: 'PATCH', body: JSON.stringify(dto) }),
  validate: (id: string) => req('/admin/volunteers/' + id + '/validate', { method: 'POST' }),
  unlock: (id: string) => req('/admin/volunteers/' + id + '/unlock', { method: 'POST' }),
  resetPassword: (id: string) =>
    req<{ tempPassword: string }>('/admin/volunteers/' + id + '/reset-password', { method: 'POST' }),
  removeBooking: (bid: string) => req('/admin/bookings/' + bid, { method: 'DELETE' }),
  audit: () => req<AuditEntry[]>('/admin/audit'),
  badgeUrl: (profileId: string) => `${BASE}/badges/volunteer/${profileId}`,
  exports: {
    volunteersCsv: `${BASE}/admin/export/volunteers.csv`,
    planningCsv: `${BASE}/admin/export/planning.csv`,
    xlsx: `${BASE}/admin/export/salon.xlsx`,
  },
};

export type BadgeVerification =
  | { valid: false }
  | {
      valid: true;
      firstName: string;
      lastName: string;
      role: string;
      hasPhoto: boolean;
      planningValidated: boolean;
      missions: {
        day: string;
        date: string;
        indexInDay: number;
        startTime: string;
        endTime: string;
        mission: string;
      }[];
    };
