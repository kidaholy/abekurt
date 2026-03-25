
const dns = require('dns');

// Test with Google DNS
dns.setServers(['8.8.8.8']);

async function testBasicDNS() {
    console.log("Testing basic DNS resolution for google.com via 8.8.8.8...");
    try {
        const addresses = await new Promise((resolve, reject) => {
            dns.resolve4('google.com', (err, data) => err ? reject(err) : resolve(data));
        });
        console.log(`✅ google.com resolved: ${addresses.join(', ')}`);
    } catch (err) {
        console.error(`❌ google.com resolution failed: ${err.message} (${err.code})`);
    }

    console.log("\nTesting system (default) DNS resolution for google.com...");
    // Let's reset servers to default or just use lookup which often uses OS resolver
    try {
        const result = await new Promise((resolve, reject) => {
            dns.lookup('google.com', (err, addr) => err ? reject(err) : resolve(addr));
        });
        console.log(`✅ google.com lookup: ${result}`);
    } catch (err) {
        console.error(`❌ google.com lookup failed: ${err.message} (${err.code})`);
    }
}

testBasicDNS();
