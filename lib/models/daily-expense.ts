import mongoose, { Schema, Document } from "mongoose"

export interface IDailyExpense extends Document {
    date: Date
    otherExpenses: number
    items: Array<{ name: string; amount: number; quantity: number; unit: string }>
    description?: string
    createdAt: Date
    updatedAt: Date
}

const DailyExpenseSchema = new Schema<IDailyExpense>(
    {
        date: {
            type: Date,
            required: true,
            unique: true,
            // Store date at midnight UTC for consistency
            set: (d: any) => {
                const date = new Date(d);
                date.setUTCHours(0, 0, 0, 0);
                return date;
            }
        },
        otherExpenses: { type: Number, default: 0 },
        items: [
            {
                name: { type: String, required: true },
                amount: { type: Number, required: true },
                quantity: { type: Number, default: 0 },
                unit: { type: String, default: 'pcs' }
            }
        ],
        description: { type: String },
    },
    {
        timestamps: true,
    }
)


const DailyExpense = mongoose.models.DailyExpense || mongoose.model<IDailyExpense>("DailyExpense", DailyExpenseSchema)

export default DailyExpense
