const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Batch = require('./lib/models/batch').default;
        const batches = await Batch.find({});
        console.log('Total Batches:', batches.length);
        batches.forEach(b => {
            console.log(` - Batch ${b.batchNumber}: isActive=${b.isActive}, id=${b._id}`);
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
check();
