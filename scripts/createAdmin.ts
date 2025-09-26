import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI required'); process.exit(1); }
  await mongoose.connect(uri as string);
  const email = process.env.INIT_ADMIN_EMAIL || 'admin@example.com';
  const pass = process.env.INIT_ADMIN_PASS || 'admin123';
  const existing = await User.findOne({ email }).exec();
  if (existing) { console.log('Admin already exists'); process.exit(0); }
  const hash = await bcrypt.hash(pass, 10);
  const u = new User({ email, passwordHash: hash, role: 'admin', name: 'Administrador' });
  await u.save();
  console.log('Admin created:', email);
  process.exit(0);
}

main().catch(e=>{ console.error(e); process.exit(1); });
