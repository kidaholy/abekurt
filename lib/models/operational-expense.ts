import mongoose, { Schema, Document } from "mongoose"

export interface IOperationalExpense extends Document {
    name?: string
    date: Date
    category: string
    amount: number
    description: string
    createdAt: Date
    updatedAt: Date
}

const OperationalExpenseSchema = new Schema<IOperationalExpense>(
    {
        date: {
            type: Date,
            required: true,
            // Store date at midnight UTC for consistency
            set: (d: any) => {
                const date = new Date(d);
                date.setUTCHours(0, 0, 0, 0);
                return date;
            }
        },
        name: { type: String },
        category: { type: String, required: true },
        amount: { type: Number, required: true },
        description: { type: String },
    },
    {
        timestamps: true,
    }
)

const OperationalExpense = mongoose.models.OperationalExpense || mongoose.model<IOperationalExpense>("OperationalExpense", OperationalExpenseSchema)

export default OperationalExpense
