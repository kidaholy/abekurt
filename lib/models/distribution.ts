import mongoose, { Schema, Document } from "mongoose"

export interface IDistribution extends Document {
    name: string
    description?: string
    createdAt: Date
    updatedAt: Date
}

const distributionSchema = new Schema<IDistribution>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String },
    },
    { timestamps: true }
)

const Distribution = mongoose.models.Distribution || mongoose.model<IDistribution>("Distribution", distributionSchema)

export default Distribution
