
const dns = require('dns');

const hostname = 'cluster0.pxcpi49.mongodb.net';

async function testLookup() {
    console.log(`Testing dns.lookup for: ${hostname}`);
    try {
        const result = await new Promise((resolve, reject) => {
            dns.lookup(hostname, (err, addr, family) => err ? reject(err) : resolve({addr, family}));
        });
        console.log(`✅ Lookup successful: ${result.addr} (family: ${result.family})`);
    } catch (err) {
        console.error(`❌ Lookup failed: ${err.message} (${err.code})`);
    }
}

testLookup();
