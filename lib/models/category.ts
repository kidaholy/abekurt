import mongoose, { Schema, Document } from "mongoose"

export interface ICategory extends Document {
    name: string
    type: 'menu' | 'stock' | 'fixed-asset'
    description?: string
    createdAt: Date
    updatedAt: Date
}

const categorySchema = new Schema<ICategory>(
    {
        name: { type: String, required: true, trim: true },
        type: { type: String, enum: ['menu', 'stock', 'fixed-asset', 'expense'], required: true },
        description: { type: String },
    },
    { timestamps: true }
)

// In development, we might need to delete the model to refresh the schema
if (process.env.NODE_ENV === "development") {
    delete mongoose.models.Category
}

const Category = mongoose.models.Category || mongoose.model<ICategory>("Category", categorySchema)

export default Category
