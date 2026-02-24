import mongoose, { Schema, Document } from "mongoose"

export interface IAuditLog extends Document {
    entityType: string // 'MenuItem', 'Order', etc.
    entityId: string
    action: 'create' | 'update' | 'delete'
    field?: string
    oldValue?: string
    newValue?: string
    performedBy: string // user email or id
    timestamp: Date
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        entityType: { type: String, required: true },
        entityId: { type: String, required: true },
        action: { type: String, enum: ['create', 'update', 'delete'], required: true },
        field: { type: String },
        oldValue: { type: String },
        newValue: { type: String },
        performedBy: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
    },
    { collection: 'audit_logs' }
)

const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", auditLogSchema)

export default AuditLog
