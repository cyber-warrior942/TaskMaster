import mongoose, { Schema, Document } from 'mongoose';

export interface InviteType extends Document {
  code: string;
  adminId: string;
  email: string;
  expiresAt: Date;
  used: boolean;
  usedBy?: string;
  createdAt: Date;
}

const InviteSchema = new Schema<InviteType>({
  code: { type: String, required: true, unique: true },
  adminId: { type: String, required: true },
  email: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  usedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const Invite = mongoose.models.Invite || mongoose.model<InviteType>('Invite', InviteSchema); 