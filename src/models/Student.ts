import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  name: string;
  age: number;
  major: string;
  gpa: number;
  contact: {
    email: string;
    phone: string;
  };
  courses: string[];
}

const StudentSchema: Schema = new Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  major: { type: String, required: true },
  gpa: { type: Number, required: true },
  contact: {
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  courses: [{ type: String }],
});

export default mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
