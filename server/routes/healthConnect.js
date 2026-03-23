const express = require('express');
const multer = require('multer');
const { parseExportZip, importMetrics, getMetrics, getLatestMetrics } = require('../services/healthConnect');

const router = express.Router();

// Store upload in memory (ZIP files from Health Connect are typically < 20 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are accepted'));
    }
  },
});

// POST /api/health-connect/import
// Accepts a Health Connect export ZIP and imports body metrics
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Send a .zip file as multipart field "file".' });
  }

  try {
    const metrics = await parseExportZip(req.file.buffer);

    if (metrics.length === 0) {
      return res.status(422).json({
        error: 'No body metrics found in this export.',
        hint: 'The ZIP should contain weight / body fat / lean mass data from Health Connect.',
      });
    }

    const result = await importMetrics(metrics);
    res.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      message: `Imported ${result.imported} measurement${result.imported !== 1 ? 's' : ''} (${result.skipped} already existed).`,
    });
  } catch (err) {
    console.error('Health Connect import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health-connect/metrics?limit=90&offset=0
router.get('/metrics', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 90, 365);
    const offset = parseInt(req.query.offset) || 0;
    const rows = await getMetrics({ limit, offset });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health-connect/latest
router.get('/latest', async (req, res) => {
  try {
    const row = await getLatestMetrics();
    res.json(row || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
