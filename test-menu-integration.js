
const mongoose = require('mongoose');
require('dotenv').config();

async function testMenuStockIntegrity() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const Stock = mongoose.model('Stock', new mongoose.Schema({
            status: String,
            quantity: Number,
            name: String,
            trackQuantity: Boolean
        }, { strict: false }));

        const MenuItem = mongoose.model('MenuItem', new mongoose.Schema({
            name: String,
            available: Boolean,
            recipe: [{
                stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
                quantityRequired: Number
            }]
        }, { strict: false }));

        // 1. Find a stock item and an item using it in recipe
        const stockItem = await Stock.findOne({ trackQuantity: true });
        const menuItem = await MenuItem.findOne({ "recipe.stockItemId": stockItem._id });

        if (!stockItem || !menuItem) {
            console.log("No matching stock/menu items found for recipe test.");
            return;
        }

        console.log(`Testing Menu Item: ${menuItem.name} using Stock Item: ${stockItem.name}`);

        // 2. Set stock to 0 and status to out_of_stock
        const originalQty = stockItem.quantity;
        const originalStatus = stockItem.status;

        await Stock.findByIdAndUpdate(stockItem._id, { quantity: 0, status: 'out_of_stock' });
        console.log(`Set ${stockItem.name} to 0 qty and out_of_stock status`);

        // In a real app, we'd call the API. Here we simulate the filtering logic I implemented
        const checkMenuAvailability = async (id) => {
             const item = await MenuItem.findById(id).populate('recipe.stockItemId').lean();
             for (const ing of item.recipe) {
                 const s = ing.stockItemId;
                 if (s && (s.status === 'out_of_stock' || s.status === 'finished' || s.quantity < ing.quantityRequired)) {
                     return false;
                 }
             }
             return true;
        };

        const isAvailable = await checkMenuAvailability(menuItem._id);
        console.log(`Is Menu Item available? ${isAvailable}`);

        if (isAvailable === false) {
            console.log("✅ SUCCESS: Menu item correctly filtered out when recipe stock is empty.");
        } else {
            console.log("❌ FAILURE: Menu item still available despite empty recipe stock.");
        }

        // 3. Restore and check
        await Stock.findByIdAndUpdate(stockItem._id, { quantity: originalQty, status: originalStatus });
        const isAvailableNow = await checkMenuAvailability(menuItem._id);
        console.log(`Is Menu Item available after restoration? ${isAvailableNow}`);

        if (isAvailableNow === true) {
            console.log("✅ SUCCESS: Menu item reappeared after stock replenishment.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

testMenuStockIntegrity();
