const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected');
        
        // Import the model to ensure it's registered
        const Table = require('./lib/models/table').default;
        
        console.log('Model Name:', Table.modelName);
        console.log('Schema Paths:', Object.keys(Table.schema.paths));
        
        const batchNumberPath = Table.schema.paths.batchNumber;
        if (batchNumberPath) {
            console.log('batchNumber config:', {
                required: batchNumberPath.isRequired,
                type: batchNumberPath.instance
            });
        } else {
            console.log('batchNumber NOT found in schema');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
check();
