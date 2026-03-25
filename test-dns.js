
const dns = require('dns');

// Manually set Google DNS for this test
dns.setServers(['8.8.8.8', '8.8.4.4']);

const hostname = 'cluster0.pxcpi49.mongodb.net';
const srvHostname = `_mongodb._tcp.${hostname}`;

async function testDNS() {
    console.log(`Testing DNS (using Google DNS 8.8.8.8) for: ${hostname}`);
    
    try {
        console.log(`\n1. Resolving SRV: ${srvHostname}`);
        const srvRecords = await new Promise((resolve, reject) => {
            dns.resolveSrv(srvHostname, (err, data) => err ? reject(err) : resolve(data));
        });
        console.log('✅ SRV Records found:', JSON.stringify(srvRecords, null, 2));

        for (const record of srvRecords) {
            console.log(`\n--- Testing Node: ${record.name} ---`);
            
            // Test resolve4
            try {
                const addresses = await new Promise((resolve, reject) => {
                    dns.resolve4(record.name, (err, data) => err ? reject(err) : resolve(data));
                });
                console.log(`✅ resolve4: ${addresses.join(', ')}`);
            } catch (err) {
                console.error(`❌ resolve4 failed: ${err.message} (${err.code})`);
            }
            
            // Test dns.lookup
            try {
                const result = await new Promise((resolve, reject) => {
                    dns.lookup(record.name, (err, addr, family) => err ? reject(err) : resolve({addr, family}));
                });
                console.log(`✅ dns.lookup: ${result.addr} (family: ${result.family})`);
            } catch (err) {
                console.error(`❌ dns.lookup failed: ${err.message} (${err.code})`);
            }
        }
    } catch (err) {
        console.error(`❌ General DNS failure (SRV): ${err.message} (${err.code})`);
        
        if (err.code === 'ENOTFOUND' || err.code === 'ESERVFAIL' || err.code === 'ETIMEOUT') {
            console.log("\nTrying fallback to OS DNS...");
            dns.setServers(['1.1.1.1', '8.8.8.8']); // Try combinations
            // Re-try logic could go here
        }
    }
}

testDNS();
