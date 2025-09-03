import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const fieldSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['text', 'textarea', 'select', 'radio', 'checkbox', 'email', 'number', 'date']
  },
  name: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  placeholder: String,
  options: [String],
  validation: {
    min: Number,
    max: Number,
    pattern: String
  }
});

const sectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  fields: [fieldSchema]
});

const formSchema = new mongoose.Schema({
  urlId: {
    type: String,
    default: () => nanoid(10),
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  markdownSource: {
    type: String,
    required: true
  },
  sections: [sectionSchema],
  settings: {
    requireEmail: {
      type: Boolean,
      default: false
    },
    allowMultipleSubmissions: {
      type: Boolean,
      default: true
    },
    showProgressBar: {
      type: Boolean,
      default: true
    },
    successMessage: {
      type: String,
      default: 'Thank you for your submission!'
    },
    theme: {
      primaryColor: {
        type: String,
        default: '#6366f1'
      },
      backgroundColor: {
        type: String,
        default: '#ffffff'
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: Date,
  responseCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: String,
    default: 'anonymous'
  }
}, {
  timestamps: true
});

// Index for URL lookup
formSchema.index({ urlId: 1, isActive: 1 });

// Virtual for form URL
formSchema.virtual('formUrl').get(function() {
  return `/form/${this.urlId}`;
});

// Method to check if form is expired
formSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

const Form = mongoose.model('Form', formSchema);

export default Form;