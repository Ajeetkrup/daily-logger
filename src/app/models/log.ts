import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

const Log = mongoose.models.Log || mongoose.model('Log', LogSchema, 'logs');
export default Log;