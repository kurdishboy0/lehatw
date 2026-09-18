const prisma = require('../db');
const { logAdminAction } = require('../utils/audit');

const TYPES = ['INFO', 'WARNING', 'SUCCESS'];
const MAX_MESSAGE = 300;

// Public: announcements showing right now, newest first.
const getActive = async (req, res) => {
  try {
    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, message_en: true, message_ar: true, message_ckb: true, type: true }
    });
    res.set('Cache-Control', 'public, max-age=60');
    res.status(200).json(announcements);
  } catch (error) {
    console.error('Active Announcements Error:', error);
    res.status(500).json({ message: 'Server error fetching announcements.' });
  }
};

const listAll = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { email: true } } }
    });
    res.status(200).json(announcements);
  } catch (error) {
    console.error('List Announcements Error:', error);
    res.status(500).json({ message: 'Server error fetching announcements.' });
  }
};

// English is required; Arabic and Kurdish fall back to English when empty.
function readAnnouncement(body) {
  const clean = (v) => {
    const s = String(v ?? '').trim();
    return s || null;
  };
  const data = {
    message_en: clean(body.message_en),
    message_ar: clean(body.message_ar),
    message_ckb: clean(body.message_ckb),
    type: TYPES.includes(body.type) ? body.type : 'INFO',
    isActive: body.isActive !== false,
    startsAt: body.startsAt ? new Date(body.startsAt) : null,
    endsAt: body.endsAt ? new Date(body.endsAt) : null
  };
  if (!data.message_en) return { error: 'Please write the message in English. Arabic and Kurdish are optional.' };
  for (const key of ['message_en', 'message_ar', 'message_ckb']) {
    if (data[key] && data[key].length > MAX_MESSAGE) return { error: `Messages can be at most ${MAX_MESSAGE} characters.` };
  }
  for (const key of ['startsAt', 'endsAt']) {
    if (data[key] && Number.isNaN(data[key].getTime())) return { error: 'That date is not valid.' };
  }
  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) return { error: 'The end must be after the start.' };
  return { data };
}

const create = async (req, res) => {
  try {
    const { data, error } = readAnnouncement(req.body);
    if (error) return res.status(400).json({ message: error });
    const announcement = await prisma.announcement.create({ data: { ...data, createdById: req.user.id } });
    await logAdminAction(req, {
      action: 'ANNOUNCEMENT_CREATED', targetType: 'ANNOUNCEMENT', targetId: announcement.id,
      summary: `Posted announcement "${data.message_en.slice(0, 80)}"`
    });
    res.status(201).json(announcement);
  } catch (error) {
    console.error('Create Announcement Error:', error);
    res.status(500).json({ message: 'Server error saving announcement.' });
  }
};

const update = async (req, res) => {
  try {
    const { data, error } = readAnnouncement(req.body);
    if (error) return res.status(400).json({ message: error });
    const announcement = await prisma.announcement.update({ where: { id: Number(req.params.id) }, data });
    await logAdminAction(req, {
      action: 'ANNOUNCEMENT_UPDATED', targetType: 'ANNOUNCEMENT', targetId: announcement.id,
      summary: `Edited announcement "${data.message_en.slice(0, 80)}"${data.isActive ? '' : ' (turned off)'}`
    });
    res.status(200).json(announcement);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Announcement not found.' });
    console.error('Update Announcement Error:', error);
    res.status(500).json({ message: 'Server error saving announcement.' });
  }
};

const remove = async (req, res) => {
  try {
    const announcement = await prisma.announcement.delete({ where: { id: Number(req.params.id) } });
    await logAdminAction(req, {
      action: 'ANNOUNCEMENT_DELETED', targetType: 'ANNOUNCEMENT', targetId: announcement.id,
      summary: `Deleted announcement "${announcement.message_en.slice(0, 80)}"`
    });
    res.status(200).json({ message: 'Deleted.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Announcement not found.' });
    console.error('Delete Announcement Error:', error);
    res.status(500).json({ message: 'Server error deleting announcement.' });
  }
};

module.exports = { getActive, listAll, create, update, remove };
