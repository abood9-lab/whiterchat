import mongoose, { Schema, type Document } from "mongoose";

// ── Contact Inquiry ──────────────────────────────────────────────────────────
export interface IContactInquiry extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  department: "general" | "support" | "report" | "business" | "press" | "security" | "careers";
  subject: string;
  message: string;
  userId?: mongoose.Types.ObjectId;
  status: "submitted" | "in_review" | "replied" | "closed";
  adminNotes?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactInquirySchema = new Schema<IContactInquiry>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    department: {
      type: String,
      enum: ["general", "support", "report", "business", "press", "security", "careers"],
      default: "general",
      required: true,
      index: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    status: {
      type: String,
      enum: ["submitted", "in_review", "replied", "closed"],
      default: "submitted",
      index: true,
    },
    adminNotes: { type: String, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

export const ContactInquiry: mongoose.Model<IContactInquiry> =
  (mongoose.models.ContactInquiry as any) ??
  mongoose.model<IContactInquiry>("ContactInquiry", ContactInquirySchema);


// ── Job Application ──────────────────────────────────────────────────────────
export interface IJobApplication extends Document {
  _id: mongoose.Types.ObjectId;
  jobId: string;
  jobSlug: string;
  jobTitle: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  resumeUrl: string;
  resumeFileName?: string;
  coverLetter?: string;
  status: "received" | "screening" | "interview" | "offer" | "rejected";
  userId?: mongoose.Types.ObjectId;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobApplicationSchema = new Schema<IJobApplication>(
  {
    jobId: { type: String, required: true, index: true },
    jobSlug: { type: String, required: true, index: true },
    jobTitle: { type: String, required: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 30, default: null },
    location: { type: String, trim: true, maxlength: 100, default: null },
    linkedinUrl: { type: String, trim: true, default: null },
    githubUrl: { type: String, trim: true, default: null },
    portfolioUrl: { type: String, trim: true, default: null },
    resumeUrl: { type: String, required: true },
    resumeFileName: { type: String, default: "resume.pdf" },
    coverLetter: { type: String, trim: true, maxlength: 6000, default: null },
    status: {
      type: String,
      enum: ["received", "screening", "interview", "offer", "rejected"],
      default: "received",
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    adminNotes: { type: String, default: null },
  },
  { timestamps: true }
);

export const JobApplication: mongoose.Model<IJobApplication> =
  (mongoose.models.JobApplication as any) ??
  mongoose.model<IJobApplication>("JobApplication", JobApplicationSchema);


// ── Security Vulnerability Report ────────────────────────────────────────────
export interface ISecurityVulnerability extends Document {
  _id: mongoose.Types.ObjectId;
  reporterName: string;
  reporterEmail: string;
  reporterHandle?: string;
  vulnerabilityType: string;
  severity: "low" | "medium" | "high" | "critical";
  targetEndpointOrComponent: string;
  description: string;
  stepsToReproduce: string;
  impactAssessment: string;
  attachments: string[];
  status: "new" | "triaged" | "fixing" | "resolved" | "out_of_scope" | "duplicate";
  cveId?: string;
  bountyEligibility?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SecurityVulnerabilitySchema = new Schema<ISecurityVulnerability>(
  {
    reporterName: { type: String, required: true, trim: true, maxlength: 120 },
    reporterEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    reporterHandle: { type: String, trim: true, default: null },
    vulnerabilityType: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    targetEndpointOrComponent: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 8000 },
    stepsToReproduce: { type: String, required: true, trim: true, maxlength: 8000 },
    impactAssessment: { type: String, required: true, trim: true, maxlength: 4000 },
    attachments: [{ type: String }],
    status: {
      type: String,
      enum: ["new", "triaged", "fixing", "resolved", "out_of_scope", "duplicate"],
      default: "new",
      index: true,
    },
    cveId: { type: String, default: null },
    bountyEligibility: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const SecurityVulnerability: mongoose.Model<ISecurityVulnerability> =
  (mongoose.models.SecurityVulnerability as any) ??
  mongoose.model<ISecurityVulnerability>("SecurityVulnerability", SecurityVulnerabilitySchema);
