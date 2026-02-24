import mongoose, { Schema } from "mongoose"

interface ISettings {
  key: string
  value: string
  type: "string" | "url" | "boolean" | "number"
  description?: string
  updatedAt: Date
}

const settingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
    type: { type: String, enum: ["string", "url", "boolean", "number"], default: "string" },
    description: { type: String },
  },
  { timestamps: true }
)

const Settings = mongoose.models.Settings || mongoose.model<ISettings>("Settings", settingsSchema)

export default Settings