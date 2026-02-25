const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Bootstrap all models
        require('./lib/models/user');
        require('./lib/models/table');
        require('./lib/models/batch');
        require('./lib/models/order');
        require('./lib/models/menu-item');
        
        console.log('Registered Models:', Object.keys(mongoose.models));
        
        for (const [name, model] of Object.entries(mongoose.models)) {
            console.log(`Model: ${name}`);
            console.log(` - Paths: ${Object.keys(model.schema.paths).join(', ')}`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
check();
