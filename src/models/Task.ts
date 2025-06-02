import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  dueDate: {
    type: Date,
    required: false,
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
  },
  assignedTo: {
    type: String,
    required: false,
  },
  assignedToName: {
    type: String,
    required: false,
  },
  createdBy: {
    type: String,
    required: true,
  },
  createdByName: {
    type: String,
    required: false,
  },
}, {
  timestamps: true,
});

export const Task = mongoose.models.Task || mongoose.model('Task', taskSchema); 