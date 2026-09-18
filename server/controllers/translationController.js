const prisma = require('../db');
const { logAdminAction } = require('../utils/audit');

const LANGS = ['en', 'ar', 'ckb'];
const KEY_PATTERN = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$/;
const MAX_VALUE = 2000;
const CACHE_TTL_MS = 60 * 1000;

// Every page load asks for the overrides, so keep them in memory briefly.
let cache = null;
let cachedAt = 0;
const invalidate = () => { cache = null; };

async function loadOverrides() {
  if (cache && Date.now() - cachedAt < CACHE_TTL_MS) return cache;
  const rows = await prisma.translationOverride.findMany({ select: { lang: true, key: true, value: true } });
  const byLang = { en: {}, ar: {}, ckb: {} };
  for (const row of rows) if (byLang[row.lang]) byLang[row.lang][row.key] = row.value;
  cache = byLang;
  cachedAt = Date.now();
  return cache;
}

// Public: admin text edits, merged over the built-in text by the client.
const getOverrides = async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    res.status(200).json(await loadOverrides());
  } catch (error) {
    console.error('Get Translations Error:', error);
    res.status(500).json({ message: 'Server error fetching translations.' });
  }
};

// Admin: the edits with who made them and when.
const listOverrides = async (req, res) => {
  try {
    const rows = await prisma.translationOverride.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { lang: true, key: true, value: true, updatedAt: true, updatedBy: { select: { email: true } } }
    });
    res.status(200).json(rows);
  } catch (error) {
    console.error('List Translations Error:', error);
    res.status(500).json({ message: 'Server error fetching translations.' });
  }
};

function readTarget(body) {
  const lang = body.lang;
  const key = String(body.key || '');
  if (!LANGS.includes(lang)) return { error: 'Language must be en, ar, or ckb.' };
  if (!KEY_PATTERN.test(key) || key.length > 200) return { error: 'That text key is not valid.' };
  return { lang, key };
}

const saveOverride = async (req, res) => {
  try {
    const { lang, key, error } = readTarget(req.body);
    if (error) return res.status(400).json({ message: error });
    const value = String(req.body.value ?? '');
    if (!value.trim()) return res.status(400).json({ message: "Text can't be empty. Use reset to go back to the original." });
    if (value.length > MAX_VALUE) return res.status(400).json({ message: `Text can be at most ${MAX_VALUE} characters.` });

    const previous = await prisma.translationOverride.findUnique({ where: { lang_key: { lang, key } } });
    const row = await prisma.translationOverride.upsert({
      where: { lang_key: { lang, key } },
      create: { lang, key, value, updatedById: req.user.id },
      update: { value, updatedById: req.user.id }
    });
    invalidate();
    await logAdminAction(req, {
      action: 'TRANSLATION_UPDATED', targetType: 'TRANSLATION', summary: `Edited ${lang} text "${key}"`,
      details: { lang, key, before: previous?.value ?? null, after: value }
    });
    res.status(200).json(row);
  } catch (error) {
    console.error('Save Translation Error:', error);
    res.status(500).json({ message: 'Server error saving translation.' });
  }
};

const resetOverride = async (req, res) => {
  try {
    const { lang, key, error } = readTarget(req.body);
    if (error) return res.status(400).json({ message: error });
    const previous = await prisma.translationOverride.findUnique({ where: { lang_key: { lang, key } } });
    if (!previous) return res.status(404).json({ message: 'This text has not been edited.' });
    await prisma.translationOverride.delete({ where: { lang_key: { lang, key } } });
    invalidate();
    await logAdminAction(req, {
      action: 'TRANSLATION_RESET', targetType: 'TRANSLATION', summary: `Reset ${lang} text "${key}" to the original`,
      details: { lang, key, before: previous.value }
    });
    res.status(200).json({ message: 'Reset.' });
  } catch (error) {
    console.error('Reset Translation Error:', error);
    res.status(500).json({ message: 'Server error resetting translation.' });
  }
};

module.exports = { getOverrides, listOverrides, saveOverride, resetOverride };
