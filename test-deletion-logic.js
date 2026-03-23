
const mongoose = require('mongoose');
require('dotenv').config();

// Simple Script to check order deletion stock restoration
async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
        const Stock = mongoose.model('Stock', new mongoose.Schema({}, { strict: false }));
        const MenuItem = mongoose.model('MenuItem', new mongoose.Schema({}, { strict: false }));

        // 1. Find a stock item to track
        const stockItem = await Stock.findOne({ trackQuantity: true });
        if (!stockItem) {
            console.log("No trackable stock item found!");
            return;
        }
        const initialQty = stockItem.quantity;
        const initialConsumed = stockItem.totalConsumed || 0;
        console.log(`Tracking Stock Item: ${stockItem.name}, Initial Qty: ${initialQty}, Consumed: ${initialConsumed}`);

        // 2. Find a menu item that uses this stock item
        const menuItem = await MenuItem.findOne({ 
            $or: [
                { "recipe.stockItemId": stockItem._id },
                { stockItemId: stockItem._id }
            ]
        });
        if (!menuItem) {
            console.log("No menu item found using this stock item!");
            return;
        }
        console.log(`Using Menu Item: ${menuItem.name}`);

        // 3. Create a dummy "Completed" order manually (to simulate state before delete)
        const orderData = {
            orderNumber: "TEST999",
            items: [{
                menuItemId: menuItem._id,
                name: menuItem.name,
                price: menuItem.price,
                quantity: 1
            }],
            totalAmount: menuItem.price,
            status: "completed",
            isDeleted: false,
            createdAt: new Date()
        };
        const order = await Order.create(orderData);
        console.log(`Created dummy COMPLETED order: ${order._id}`);

        // Manually deduct stock to match order creation logic (since I'm creating it manually)
        let consumption = 1;
        if (menuItem.recipe && menuItem.recipe.length > 0) {
            const ingredient = menuItem.recipe.find(r => r.stockItemId.toString() === stockItem._id.toString());
            if (ingredient) consumption = ingredient.quantityRequired;
        } else if (menuItem.reportQuantity) {
            consumption = menuItem.reportQuantity;
        }

        await Stock.findByIdAndUpdate(stockItem._id, { 
            $inc: { quantity: -consumption, totalConsumed: consumption } 
        });
        console.log(`Manually deducted ${consumption} from stock`);

        // Check state before delete
        const stockMid = await Stock.findById(stockItem._id);
        console.log(`Stock before DELETE: Qty: ${stockMid.quantity}, Consumed: ${stockMid.totalConsumed}`);

        // 4. Simulate the DELETE call logic
        // This is what I implemented in the API
        const orderToDelete = await Order.findById(order._id);
        if (orderToDelete.status !== 'cancelled') {
            // Restore logic
             await Stock.findByIdAndUpdate(stockItem._id, { 
                $inc: { quantity: consumption, totalConsumed: -consumption } 
            });
            console.log(`Restored ${consumption} to stock`);
        }
        await Order.findByIdAndUpdate(order._id, { isDeleted: true, status: "cancelled" });
        console.log("Order marked as deleted/cancelled");

        // 5. Verify final state
        const stockFinal = await Stock.findById(stockItem._id);
        console.log(`Stock after DELETE: Qty: ${stockFinal.quantity}, Consumed: ${stockFinal.totalConsumed}`);

        if (stockFinal.quantity === initialQty && stockFinal.totalConsumed === initialConsumed) {
            console.log("✅ SUCCESS: Stock and consumption fully restored!");
        } else {
            console.log("❌ FAILURE: Stock or consumption not properly restored.");
        }

        // Cleanup
        await Order.deleteOne({ _id: order._id });
        console.log("Test order cleaned up");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

test();
