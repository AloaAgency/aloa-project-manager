import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true,
    index: true
  },
  formUrlId: {
    type: String,
    required: true,
    index: true
  },
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  },
  respondentInfo: {
    email: String,
    ipAddress: String,
    userAgent: String
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    timeSpent: Number, // in seconds
    deviceType: String,
    referrer: String
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
responseSchema.index({ formId: 1, submittedAt: -1 });
responseSchema.index({ formUrlId: 1, submittedAt: -1 });

const Response = mongoose.model('Response', responseSchema);

export default Response;