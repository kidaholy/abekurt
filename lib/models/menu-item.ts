import mongoose, { Schema } from "mongoose"

// Recipe ingredient - defines what stock items are consumed when this menu item is ordered
interface IRecipeIngredient {
  stockItemId: mongoose.Types.ObjectId
  stockItemName: string // For display purposes
  quantityRequired: number // How much of this stock item is consumed per menu item
  unit: string // Should match the stock item's unit
}

interface IMenuItem {
  menuId: string
  name: string
  mainCategory: 'Food' | 'Drinks'
  category: string
  price: number
  available: boolean
  description?: string
  image?: string
  preparationTime?: number

  // Enhanced recipe system
  recipe: IRecipeIngredient[] // List of stock items consumed when this item is ordered

  // Legacy fields (kept for backward compatibility)
  ingredients?: string[]
  stockItemId?: mongoose.Types.ObjectId
  stockConsumption?: number
  reportUnit?: 'kg' | 'liter' | 'piece'
  reportQuantity?: number
  distributions?: string[]  // e.g. ["Hot", "Cold", "Iced"]
}

const RecipeIngredientSchema = new Schema<IRecipeIngredient>({
  stockItemId: { type: Schema.Types.ObjectId, ref: "Stock", required: true },
  stockItemName: { type: String, required: true },
  quantityRequired: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true }
})

const menuItemSchema = new Schema<IMenuItem>(
  {
    menuId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    mainCategory: { type: String, enum: ['Food', 'Drinks'], default: 'Food' },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    available: { type: Boolean, default: true },
    description: { type: String },
    image: { type: String },
    preparationTime: { type: Number, default: 10 },

    // Enhanced recipe system
    recipe: [RecipeIngredientSchema],

    // Legacy fields (kept for backward compatibility)
    ingredients: [{ type: String }],
    stockItemId: { type: Schema.Types.ObjectId, ref: "Stock" },
    stockConsumption: { type: Number, default: 0 },
    reportUnit: { type: String, enum: ['kg', 'liter', 'piece'], default: 'piece' },
    reportQuantity: { type: Number, default: 0 },
    distributions: [{ type: String }],
  },
  { timestamps: true }
)

// Method to check if menu item can be prepared (all ingredients available)
menuItemSchema.methods.canBePrepared = async function (quantity: number = 1): Promise<{ available: boolean, missingIngredients: string[] }> {
  const Stock = mongoose.model('Stock')
  const missingIngredients: string[] = []

  for (const ingredient of this.recipe) {
    const stockItem = await Stock.findById(ingredient.stockItemId)
    if (!stockItem || !stockItem.isAvailableForOrder(ingredient.quantityRequired * quantity)) {
      missingIngredients.push(`${ingredient.stockItemName} (need ${ingredient.quantityRequired * quantity} ${ingredient.unit})`)
    }
  }

  return {
    available: missingIngredients.length === 0,
    missingIngredients
  }
}

// Method to consume ingredients when item is ordered
menuItemSchema.methods.consumeIngredients = async function (quantity: number = 1): Promise<{ success: boolean, errors: string[] }> {
  const Stock = mongoose.model('Stock')
  const errors: string[] = []
  const consumedItems: { item: any, quantity: number }[] = []

  // First, check if all ingredients are available
  const availability = await this.canBePrepared(quantity)
  if (!availability.available) {
    return {
      success: false,
      errors: [`Cannot prepare ${this.name}: Missing ingredients - ${availability.missingIngredients.join(', ')}`]
    }
  }

  // Consume each ingredient
  for (const ingredient of this.recipe) {
    const stockItem = await Stock.findById(ingredient.stockItemId)
    if (stockItem) {
      const consumeSuccess = stockItem.consumeStock(ingredient.quantityRequired * quantity)
      if (consumeSuccess) {
        await stockItem.save()
        consumedItems.push({ item: stockItem, quantity: ingredient.quantityRequired * quantity })
      } else {
        // Rollback previous consumptions
        for (const consumed of consumedItems) {
          consumed.item.quantity += consumed.quantity
          consumed.item.totalConsumed -= consumed.quantity
          await consumed.item.save()
        }
        errors.push(`Failed to consume ${ingredient.stockItemName}`)
        break
      }
    } else {
      errors.push(`Stock item ${ingredient.stockItemName} not found`)
    }
  }

  return {
    success: errors.length === 0,
    errors
  }
}


const MenuItem = mongoose.models.MenuItem || mongoose.model<IMenuItem>("MenuItem", menuItemSchema)

export default MenuItem
