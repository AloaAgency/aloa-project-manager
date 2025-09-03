import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const FieldSchema = new mongoose.Schema({
  label: { type: String, required: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['text', 'email', 'number', 'tel', 'url', 'textarea', 'select', 'radio', 'checkbox', 'date', 'time', 'file']
  },
  required: { type: Boolean, default: false },
  placeholder: String,
  options: [String],
  validation: {
    minLength: Number,
    maxLength: Number,
    min: Number,
    max: Number,
    pattern: String
  }
});

const FormSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  fields: [FieldSchema],
  urlId: { 
    type: String, 
    unique: true,
    default: () => nanoid(10)
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

FormSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Form || mongoose.model('Form', FormSchema);