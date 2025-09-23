import express from 'express';
import multer from 'multer';
import Form from '../models/Form.js';
import Response from '../models/Response.js';
import { parseMarkdown, validateFormStructure } from '../utils/markdownParser.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/markdown' || 
        file.mimetype === 'text/plain' ||
        file.originalname.endsWith('.md')) {
      cb(null, true);
    } else {
      cb(new Error('Only markdown files are allowed'));
    }
  }
});

// Create form from uploaded markdown file
router.post('/upload', upload.single('markdown'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse markdown content
    const markdownContent = req.file.buffer.toString('utf-8');
    const formData = parseMarkdown(markdownContent);

    // Validate structure
    const validation = validateFormStructure(formData);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid form structure', 
        details: validation.errors 
      });
    }

    // Create form with additional settings from request body
    const form = new Form({
      ...formData,
      markdownSource: markdownContent,
      settings: req.body.settings || {},
      expiresAt: req.body.expiresAt,
      createdBy: req.body.createdBy || 'anonymous'
    });

    await form.save();

    res.status(201).json({
      success: true,
      form: {
        id: form._id,
        urlId: form.urlId,
        title: form.title,
        description: form.description,
        formUrl: `/form/${form.urlId}`,
        fullUrl: `${req.protocol}://${req.get('host')}/form/${form.urlId}`,
        createdAt: form.createdAt
      }
    });
  } catch (error) {

    res.status(500).json({ error: error.message });
  }
});

// Create form from markdown text
router.post('/create', async (req, res) => {
  try {
    const { markdown, settings, expiresAt, createdBy } = req.body;

    if (!markdown) {
      return res.status(400).json({ error: 'Markdown content is required' });
    }

    // Parse markdown content
    const formData = parseMarkdown(markdown);

    // Validate structure
    const validation = validateFormStructure(formData);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid form structure', 
        details: validation.errors 
      });
    }

    // Create form
    const form = new Form({
      ...formData,
      markdownSource: markdown,
      settings: settings || {},
      expiresAt,
      createdBy: createdBy || 'anonymous'
    });

    await form.save();

    res.status(201).json({
      success: true,
      form: {
        id: form._id,
        urlId: form.urlId,
        title: form.title,
        description: form.description,
        formUrl: `/form/${form.urlId}`,
        fullUrl: `${req.protocol}://${req.get('host')}/form/${form.urlId}`,
        createdAt: form.createdAt
      }
    });
  } catch (error) {

    res.status(500).json({ error: error.message });
  }
});

// Get form by URL ID (public endpoint for form display)
router.get('/public/:urlId', async (req, res) => {
  try {
    const form = await Form.findOne({ 
      urlId: req.params.urlId,
      isActive: true 
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.isExpired()) {
      return res.status(410).json({ error: 'This form has expired' });
    }

    // Return public form data (without sensitive info)
    res.json({
      id: form._id,
      urlId: form.urlId,
      title: form.title,
      description: form.description,
      sections: form.sections,
      settings: {
        requireEmail: form.settings.requireEmail,
        showProgressBar: form.settings.showProgressBar,
        successMessage: form.settings.successMessage,
        theme: form.settings.theme
      }
    });
  } catch (error) {

    res.status(500).json({ error: error.message });
  }
});

// Get all forms (admin)
router.get('/', async (req, res) => {
  try {
    const { createdBy = 'anonymous', includeInactive = false } = req.query;

    const query = { createdBy };
    if (!includeInactive) {
      query.isActive = true;
    }

    const forms = await Form.find(query)
      .select('-markdownSource -sections')
      .sort({ createdAt: -1 });

    res.json(forms);
  } catch (error) {

    res.status(500).json({ error: error.message });
  }
});

// Get form details with responses (admin)
router.get('/:id', async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Get response statistics
    const responseStats = await Response.aggregate([
      { $match: { formId: form._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          lastSubmission: { $max: '$submittedAt' }
        }
      }
    ]);

    res.json({
      ...form.toObject(),
      stats: responseStats[0] || { total: 0, lastSubmission: null }
    });
  } catch (error) {

    res.status(500).json({ error: error.message });
  }
});

// Update form settings
router.patch('/:id', async (req, res) => {
  try {
    const { settings, isActive, expiresAt } = req.body;

    const form = await Form.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(settings && { settings }),
          ...(isActive !== undefined && { isActive }),
          ...(expiresAt !== undefined && { expiresAt })
        }
      },
      { new: true }
    );

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(form);
  } catch (error) {

    res.status(500).json({ error: error.message });
  }
});

// Delete form
router.delete('/:id', async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Delete all responses
    await Response.deleteMany({ formId: form._id });

    // Delete form
    await form.deleteOne();

    res.json({ success: true, message: 'Form and responses deleted' });
  } catch (error) {

    res.status(500).json({ error: error.message });
  }
});

export default router;