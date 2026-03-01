
const mongoose = require('mongoose');

async function listCollections() {
  try {
    const uri = 'mongodb://localhost:27017/restaurant-management';
    await mongoose.connect(uri);
    console.log('Connected to ' + uri);

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections in ' + uri + ':');
    
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(` - ${coll.name}: ${count} docs`);
      if (coll.name === 'orders') {
        const sample = await db.collection(coll.name).find({}).limit(1).toArray();
        console.log('Sample order status values:', sample.map(o => o.status));
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listCollections();
