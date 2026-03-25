
const dns = require('dns');

// Explicitly set to local DNS server found in ipconfig
dns.setServers(['192.168.8.1']);

const hostname = 'cluster0.pxcpi49.mongodb.net';
const srvHostname = `_mongodb._tcp.${hostname}`;

async function testLocalDNS() {
    console.log("Testing DNS resolution via local server 192.168.8.1...");
    try {
        const srvRecords = await new Promise((resolve, reject) => {
            dns.resolveSrv(srvHostname, (err, data) => err ? reject(err) : resolve(data));
        });
        console.log('✅ SRV Records found:', JSON.stringify(srvRecords, null, 2));

        for (const record of srvRecords) {
            try {
                const addresses = await new Promise((resolve, reject) => {
                    dns.resolve4(record.name, (err, data) => err ? reject(err) : resolve(data));
                });
                console.log(`✅ ${record.name} resolved to: ${addresses.join(', ')}`);
            } catch (err) {
                console.error(`❌ Failed to resolve A for ${record.name}: ${err.message}`);
            }
        }
    } catch (err) {
        console.error(`❌ SRV resolution failed: ${err.message} (${err.code})`);
    }
}

testLocalDNS();
