import { Schema, model } from 'mongoose';

const timestamps = { timestamps: true, versionKey: false as const };

export type IdentityRole = 'user' | 'admin' | 'student';

export const IdentityUserModel = model(
  'IdentityUser',
  new Schema(
    {
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      name: { type: String, required: true },
      passwordHash: { type: String, required: true },
      passwordSalt: { type: String, required: true },
      role: { type: String, enum: ['user', 'admin', 'student'], default: 'user' },
      permissions: [{ type: String }],
      avatarUrl: String,
      avatarInitials: String,
      emailVerifiedAt: Date,
      lastLoginAt: Date,
      disabledAt: Date,
      temporaryAdminUntil: Date
    },
    timestamps
  )
);

export const IdentityAuditLogModel = model(
  'IdentityAuditLog',
  new Schema(
    {
      actorUserId: { type: Schema.Types.ObjectId, ref: 'IdentityUser', index: true },
      targetUserId: { type: Schema.Types.ObjectId, ref: 'IdentityUser', index: true },
      action: { type: String, required: true, index: true },
      metadata: Schema.Types.Mixed
    },
    timestamps
  )
);

export const IdentityActivityModel = model(
  'IdentityActivity',
  new Schema(
    {
      userId: { type: Schema.Types.ObjectId, ref: 'IdentityUser', required: true, index: true },
      platform: { type: String, required: true, index: true },
      type: { type: String, enum: ['login', 'visit', 'active_time'], required: true, index: true },
      dateKey: { type: String, required: true, index: true },
      hourKey: { type: String, index: true },
      durationSeconds: { type: Number, default: 0 },
      metadata: Schema.Types.Mixed
    },
    timestamps
  )
);

export const IdentityRememberedBrowserModel = model(
  'IdentityRememberedBrowser',
  new Schema(
    {
      userId: { type: Schema.Types.ObjectId, ref: 'IdentityUser', required: true, index: true },
      tokenHash: { type: String, required: true, unique: true, index: true },
      expiresAt: { type: Date, required: true, index: true },
      lastUsedAt: { type: Date, default: Date.now },
      userAgent: String
    },
    timestamps
  )
);

export const IdentityPasswordResetGrantModel = model(
  'IdentityPasswordResetGrant',
  new Schema(
    {
      email: { type: String, required: true, lowercase: true, trim: true, index: true },
      tokenHash: { type: String, required: true, unique: true, index: true },
      expiresAt: { type: Date, required: true, index: { expires: 0 } },
      consumedAt: { type: Date }
    },
    timestamps
  )
);

export const IdentityOtpModel = model(
  'IdentityOtp',
  new Schema(
    {
      email: { type: String, required: true, lowercase: true, trim: true, index: true },
      purpose: { type: String, enum: ['verify_email', 'reset_password'], required: true, index: true },
      otpHash: { type: String, required: true },
      otpSalt: { type: String, required: true },
      expiresAt: { type: Date, required: true, index: true },
      consumedAt: Date,
      attempts: { type: Number, default: 0 }
    },
    timestamps
  )
);

export const IdentitySessionModel = model(
  'IdentitySession',
  new Schema(
    {
      userId: { type: Schema.Types.ObjectId, ref: 'IdentityUser', required: true, index: true },
      sessionHash: { type: String, required: true, unique: true, index: true },
      userAgent: String,
      ipAddress: String,
      expiresAt: { type: Date, required: true, index: true },
      revokedAt: Date,
      lastSeenAt: Date,
      createdByApp: { type: String, default: 'sk-central' }
    },
    timestamps
  )
);
