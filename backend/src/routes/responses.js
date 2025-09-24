import express from 'express';
import Form from '../models/Form.js';
import Response from '../models/Response.js';

const router = express.Router();

// Submit response to a form
router.post('/submit/:urlId', async (req, res) => {
  try {
    const { urlId } = req.params;
    const { answers, email, metadata } = req.body;

    // Find the form
    const form = await Form.findOne({ 
      urlId, 
      isActive: true 
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.isExpired()) {
      return res.status(410).json({ error: 'This form has expired' });
    }

    // Validate required fields
    const validationErrors = [];
    form.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.required && !answers[field.name]) {
          validationErrors.push(`${field.label} is required`);
        }
      });
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }

    // Check if email is required
    if (form.settings.requireEmail && !email) {
      return res.status(400).json({ error: 'Email is required for this form' });
    }

    // Create response
    const response = new Response({
      formId: form._id,
      formUrlId: urlId,
      answers,
      respondentInfo: {
        email,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      },
      metadata: {
        ...metadata,
        referrer: req.get('referrer')
      }
    });

    await response.save();

    // Increment response count
    await Form.findByIdAndUpdate(form._id, {
      $inc: { responseCount: 1 }
    });

    res.status(201).json({
      success: true,
      message: form.settings.successMessage || 'Thank you for your submission!',
      responseId: response._id
    });
  } catch (error) {

    res.status(500).json({ error: error.message });
  }
});

// Get responses for a form (admin)
router.get('/form/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    const { page = 1, limit = 50, export: shouldExport } = req.query;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const query = { formId };

    if (shouldExport === 'true') {
      // Export all responses
      const responses = await Response.find(query)
        .sort({ submittedAt: -1 })
        .lean();

      // Format for CSV export
      const csvData = formatResponsesForExport(form, responses);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${form.title}-responses.csv"`);
      return res.send(csvData);
    }

    // Paginated responses
    const skip = (page - 1) * limit;
    const responses = await Response.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Response.countDocuments(query);

    res.json({
      responses,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {

    res.status(500).json({ error: error.message });
  }
});

// Get response statistics for a form
router.get('/stats/:formId', async (req, res) => {
  try {
    const { formId } = req.params;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Aggregate statistics
    const stats = await Response.aggregate([
      { $match: { formId: form._id } },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          uniqueEmails: { $addToSet: '$respondentInfo.email' },
          avgTimeSpent: { $avg: '$metadata.timeSpent' },
          lastSubmission: { $max: '$submittedAt' },
          firstSubmission: { $min: '$submittedAt' }
        }
      },
      {
        $project: {
          totalResponses: 1,
          uniqueRespondents: { $size: { $ifNull: ['$uniqueEmails', []] } },
          avgTimeSpent: { $round: ['$avgTimeSpent', 0] },
          lastSubmission: 1,
          firstSubmission: 1
        }
      }
    ]);

    // Field-level statistics
    const fieldStats = {};
    const responses = await Response.find({ formId: form._id }).lean();

    form.sections.forEach(section => {
      section.fields.forEach(field => {
        const fieldAnswers = responses.map(r => r.answers.get(field.name)).filter(Boolean);

        if (field.type === 'select' || field.type === 'radio') {
          // Count option selections
          const optionCounts = {};
          fieldAnswers.forEach(answer => {
            optionCounts[answer] = (optionCounts[answer] || 0) + 1;
          });
          fieldStats[field.name] = {
            type: field.type,
            label: field.label,
            responses: fieldAnswers.length,
            distribution: optionCounts
          };
        } else if (field.type === 'checkbox') {
          // Count checkbox selections
          const optionCounts = {};
          fieldAnswers.forEach(answers => {
            (Array.isArray(answers) ? answers : [answers]).forEach(answer => {
              optionCounts[answer] = (optionCounts[answer] || 0) + 1;
            });
          });
          fieldStats[field.name] = {
            type: field.type,
            label: field.label,
            responses: fieldAnswers.length,
            distribution: optionCounts
          };
        } else {
          // Text/textarea/email/number/date
          fieldStats[field.name] = {
            type: field.type,
            label: field.label,
            responses: fieldAnswers.length,
            filled: fieldAnswers.length,
            fillRate: ((fieldAnswers.length / responses.length) * 100).toFixed(1) + '%'
          };
        }
      });
    });

    res.json({
      summary: stats[0] || {
        totalResponses: 0,
        uniqueRespondents: 0,
        avgTimeSpent: 0
      },
      fieldStats,
      formTitle: form.title
    });
  } catch (error) {

    res.status(500).json({ error: error.message });
  }
});

// Delete a response
router.delete('/:id', async (req, res) => {
  try {
    const response = await Response.findById(req.params.id);

    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    // Decrement form response count
    await Form.findByIdAndUpdate(response.formId, {
      $inc: { responseCount: -1 }
    });

    await response.deleteOne();

    res.json({ success: true, message: 'Response deleted' });
  } catch (error) {

    res.status(500).json({ error: error.message });
  }
});

// Helper function to format responses for CSV export
function formatResponsesForExport(form, responses) {
  // Build CSV headers
  const headers = ['Submitted At', 'Email'];
  form.sections.forEach(section => {
    section.fields.forEach(field => {
      headers.push(field.label);
    });
  });
  headers.push('Time Spent (seconds)', 'IP Address');

  // Build CSV rows
  const rows = responses.map(response => {
    const row = [
      new Date(response.submittedAt).toISOString(),
      response.respondentInfo?.email || ''
    ];

    form.sections.forEach(section => {
      section.fields.forEach(field => {
        const answer = response.answers[field.name];
        if (Array.isArray(answer)) {
          row.push(answer.join(', '));
        } else {
          row.push(answer || '');
        }
      });
    });

    row.push(response.metadata?.timeSpent || '');
    row.push(response.respondentInfo?.ipAddress || '');

    return row;
  });

  // Convert to CSV format
  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csvContent;
}

export default router;