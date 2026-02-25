const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const batch = await db.collection('batches').findOne({});
        console.log('Sample Batch:', JSON.stringify(batch, null, 2));
        
        const floor = await db.collection('floors').findOne({});
        console.log('Sample Floor:', JSON.stringify(floor, null, 2));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
check();
