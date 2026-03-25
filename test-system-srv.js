
const dns = require('dns');

// DO NOT set servers, use system default

const hostname = 'cluster0.pxcpi49.mongodb.net';
const srvHostname = `_mongodb._tcp.${hostname}`;

async function testSystemSRV() {
    console.log("Testing system DNS resolution for SRV record...");
    try {
        const srvRecords = await new Promise((resolve, reject) => {
            dns.resolveSrv(srvHostname, (err, data) => err ? reject(err) : resolve(data));
        });
        console.log('✅ SRV Records found:', JSON.stringify(srvRecords, null, 2));
    } catch (err) {
        console.error(`❌ SRV resolution failed: ${err.message} (${err.code})`);
    }

    console.log("\nTesting system DNS resolution for plain A record...");
    try {
        const addresses = await new Promise((resolve, reject) => {
            dns.resolve4(hostname, (err, data) => err ? reject(err) : resolve(data));
        });
        console.log(`✅ A record resolved: ${addresses.join(', ')}`);
    } catch (err) {
        console.error(`❌ A record resolution failed: ${err.message} (${err.code})`);
    }
}

testSystemSRV();
