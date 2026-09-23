const prisma = require('../db');
const { logAdminAction } = require('../utils/audit');
const { notifyUser } = require('../utils/notify');

const TYPES = ['ACADEMIC', 'COMPANY', 'CAREER_FAIR', 'WORKSHOP', 'OTHER'];
const MAX_TITLE = 200;
const MAX_TEXT = 4000;

const clean = (value, max) => {
  const s = String(value ?? '').trim();
  return s ? s.slice(0, max) : null;
};

// What everyone may see about an event. The joining link is only included
// for people who registered, so it isn't public.
function publicEvent(event, { registered = false, registrationCount = 0, isAdmin = false } = {}) {
  const { registrations, _count, onlineUrl, ...rest } = event;
  return {
    ...rest,
    onlineUrl: registered || isAdmin ? onlineUrl : null,
    registrationCount: _count ? _count.registrations : registrationCount,
    spotsLeft: event.capacity === null ? null : Math.max(0, event.capacity - (_count ? _count.registrations : registrationCount)),
    registered
  };
}

// ============ Public ============

// Upcoming events by default; ?past=1 for ones that already happened.
const listEvents = async (req, res) => {
  try {
    const now = new Date();
    const past = req.query.past === '1';
    // An event counts as over once its end time (or start, when there is no
    // end) has passed.
    const timeFilter = past
      ? { OR: [{ endsAt: { lt: now } }, { endsAt: null, startsAt: { lt: now } }] }
      : { OR: [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: now } }] };

    const events = await prisma.event.findMany({
      where: { isPublished: true, ...timeFilter },
      orderBy: { startsAt: past ? 'desc' : 'asc' },
      take: 100,
      include: { _count: { select: { registrations: true } } }
    });

    // Mark the ones this viewer already signed up for.
    const mine = req.user
      ? new Set((await prisma.eventRegistration.findMany({ where: { userId: req.user.id }, select: { eventId: true } })).map((r) => r.eventId))
      : new Set();
    res.status(200).json(events.map((e) => publicEvent(e, { registered: mine.has(e.id) })));
  } catch (error) {
    console.error('List Events Error:', error);
    res.status(500).json({ message: 'Server error loading events.' });
  }
};

const getEvent = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: Number(req.params.id) },
      include: { _count: { select: { registrations: true } } }
    });
    const isAdmin = req.user?.role === 'ADMIN';
    if (!event || (!event.isPublished && !isAdmin)) return res.status(404).json({ message: 'Event not found.' });

    const registered = req.user
      ? Boolean(await prisma.eventRegistration.findUnique({ where: { eventId_userId: { eventId: event.id, userId: req.user.id } } }))
      : false;
    res.status(200).json(publicEvent(event, { registered, isAdmin }));
  } catch (error) {
    console.error('Get Event Error:', error);
    res.status(500).json({ message: 'Server error loading the event.' });
  }
};

const register = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: Number(req.params.id) },
      include: { _count: { select: { registrations: true } } }
    });
    if (!event || !event.isPublished) return res.status(404).json({ message: 'Event not found.' });
    if (event.registrationUrl) return res.status(400).json({ message: 'This event takes registrations on another website.' });
    const over = (event.endsAt || event.startsAt) < new Date();
    if (over) return res.status(400).json({ message: 'This event has already finished.' });
    if (event.capacity !== null && event._count.registrations >= event.capacity) {
      return res.status(409).json({ message: 'This event is full.' });
    }

    try {
      await prisma.eventRegistration.create({ data: { eventId: event.id, userId: req.user.id } });
    } catch (error) {
      if (error.code === 'P2002') return res.status(200).json({ message: 'You are already registered.', registered: true });
      throw error;
    }
    res.status(201).json({ message: 'You are registered.', registered: true });
  } catch (error) {
    console.error('Register Event Error:', error);
    res.status(500).json({ message: 'Server error registering you.' });
  }
};

const cancelRegistration = async (req, res) => {
  try {
    await prisma.eventRegistration.deleteMany({ where: { eventId: Number(req.params.id), userId: req.user.id } });
    res.status(200).json({ message: 'Registration cancelled.', registered: false });
  } catch (error) {
    console.error('Cancel Registration Error:', error);
    res.status(500).json({ message: 'Server error cancelling your registration.' });
  }
};

// ============ Admin ============

const listAllEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { startsAt: 'desc' },
      include: { _count: { select: { registrations: true } }, createdBy: { select: { email: true } } }
    });
    res.status(200).json(events.map((e) => ({ ...e, registrationCount: e._count.registrations })));
  } catch (error) {
    console.error('List All Events Error:', error);
    res.status(500).json({ message: 'Server error loading events.' });
  }
};

function readEvent(body) {
  const title_en = clean(body.title_en, MAX_TITLE);
  if (!title_en) return { error: 'Please write the event title in English. Arabic and Kurdish are optional.' };
  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) return { error: 'Please choose when the event starts.' };
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) return { error: 'That end time is not valid.' };
  if (endsAt && endsAt <= startsAt) return { error: 'The event must end after it starts.' };
  const capacity = body.capacity === '' || body.capacity === null || body.capacity === undefined ? null : Number(body.capacity);
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) return { error: 'Capacity must be a whole number, or empty for no limit.' };

  const isOnline = body.isOnline === true;
  const data = {
    title_en,
    title_ar: clean(body.title_ar, MAX_TITLE),
    title_ckb: clean(body.title_ckb, MAX_TITLE),
    description_en: clean(body.description_en, MAX_TEXT),
    description_ar: clean(body.description_ar, MAX_TEXT),
    description_ckb: clean(body.description_ckb, MAX_TEXT),
    type: TYPES.includes(body.type) ? body.type : 'ACADEMIC',
    host: clean(body.host, 200),
    location: clean(body.location, 200),
    isOnline,
    onlineUrl: isOnline ? clean(body.onlineUrl, 500) : null,
    startsAt,
    endsAt,
    capacity,
    registrationUrl: clean(body.registrationUrl, 500),
    isPublished: body.isPublished !== false
  };
  if (!data.isOnline && !data.location) return { error: 'Add a location, or mark the event as online.' };
  return { data };
}

const createEvent = async (req, res) => {
  try {
    const { data, error } = readEvent(req.body);
    if (error) return res.status(400).json({ message: error });
    const event = await prisma.event.create({ data: { ...data, createdById: req.user.id } });
    await logAdminAction(req, {
      action: 'EVENT_CREATED', targetType: 'EVENT', targetId: event.id,
      summary: `Created event "${event.title_en}"`
    });
    res.status(201).json(event);
  } catch (error) {
    console.error('Create Event Error:', error);
    res.status(500).json({ message: 'Server error saving the event.' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { data, error } = readEvent(req.body);
    if (error) return res.status(400).json({ message: error });
    const before = await prisma.event.findUnique({ where: { id: Number(req.params.id) }, select: { startsAt: true, location: true, isOnline: true } });
    if (!before) return res.status(404).json({ message: 'Event not found.' });
    const event = await prisma.event.update({ where: { id: Number(req.params.id) }, data });

    // Tell the people who signed up when the time or place changed.
    const moved = before.startsAt.getTime() !== event.startsAt.getTime() || before.location !== event.location || before.isOnline !== event.isOnline;
    if (moved) {
      const registrations = await prisma.eventRegistration.findMany({ where: { eventId: event.id }, select: { userId: true } });
      for (const r of registrations) {
        notifyUser(r.userId, {
          type: 'EVENT_UPDATED', title: 'An event you registered for changed',
          body: event.title_en, link: `/events/${event.id}`
        });
      }
    }
    await logAdminAction(req, {
      action: 'EVENT_UPDATED', targetType: 'EVENT', targetId: event.id,
      summary: `Edited event "${event.title_en}"${event.isPublished ? '' : ' (unpublished)'}`
    });
    res.status(200).json(event);
  } catch (error) {
    console.error('Update Event Error:', error);
    res.status(500).json({ message: 'Server error saving the event.' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: Number(req.params.id) }, include: { registrations: { select: { userId: true } } } });
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    await prisma.event.delete({ where: { id: event.id } });

    for (const r of event.registrations) {
      notifyUser(r.userId, {
        type: 'EVENT_CANCELLED', title: 'An event you registered for was cancelled',
        body: event.title_en, link: '/events'
      });
    }
    await logAdminAction(req, {
      action: 'EVENT_DELETED', targetType: 'EVENT', targetId: event.id,
      summary: `Deleted event "${event.title_en}"`, details: { registrations: event.registrations.length }
    });
    res.status(200).json({ message: 'Event deleted.' });
  } catch (error) {
    console.error('Delete Event Error:', error);
    res.status(500).json({ message: 'Server error deleting the event.' });
  }
};

// Who signed up, so an admin can prepare or contact them.
const listRegistrations = async (req, res) => {
  try {
    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId: Number(req.params.id) },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true, email: true, phone: true, role: true,
            studentProfile: { select: { id: true, fullName: true, university: true, fieldOfStudy: true } },
            hrProfile: { select: { companyName: true } }
          }
        }
      }
    });
    res.status(200).json(registrations.map((r) => ({
      id: r.id,
      registeredAt: r.createdAt,
      userId: r.user.id,
      email: r.user.email,
      phone: r.user.phone,
      role: r.user.role,
      name: r.user.studentProfile?.fullName || r.user.hrProfile?.companyName || null,
      studentProfileId: r.user.studentProfile?.id || null,
      university: r.user.studentProfile?.university || null,
      fieldOfStudy: r.user.studentProfile?.fieldOfStudy || null
    })));
  } catch (error) {
    console.error('List Registrations Error:', error);
    res.status(500).json({ message: 'Server error loading the attendee list.' });
  }
};

module.exports = {
  listEvents, getEvent, register, cancelRegistration,
  listAllEvents, createEvent, updateEvent, deleteEvent, listRegistrations
};
