
import dns from "dns";

/**
 * Robust DNS Fix for Environments with Broken OS DNS
 * This utility:
 * 1. Sets Google DNS as the preferred resolver for Node.js `dns.resolve*` calls.
 * 2. Overrides the global `dns.lookup` used by MongoDB/Mongoose.
 * 3. Recursively follows CNAME chains.
 * 4. Extracts IP addresses from AWS `ec2-x-y-z-w` hostnames if resolution fails.
 */

const originalLookup = dns.lookup;
// Include local gateway and common public DNS as fallbacks
dns.setServers(['192.168.8.1', '192.168.1.1', '1.1.1.1', '8.8.8.8']);

async function recursiveHybridResolve(hostname: string): Promise<{ address: string, family: number }> {
    // 1. Try A record resolution via Google DNS
    try {
        const addresses = await new Promise<string[]>((resolve, reject) => {
            dns.resolve4(hostname, (err, data) => err ? reject(err) : resolve(data));
        });
        if (addresses && addresses.length > 0) {
            return { address: addresses[0], family: 4 };
        }
    } catch (e) {
        // Ignore and proceed to fallback
    }

    // 2. AWS EC2 Pattern fallback (e.g. ec2-159-41-77-250.me-south-1.compute.amazonaws.com)
    // Extract IP directly from hostname if it follows the EC2 convention
    const awsMatch = hostname.match(/^ec2-([0-9-]+)\./);
    if (awsMatch) {
        const ip = awsMatch[1].replace(/-/g, '.');
        console.log(`🌐 DNS Fix: Extracted IP from AWS host ${hostname} -> ${ip}`);
        return { address: ip, family: 4 };
    }

    // 3. Try CNAME resolution and recurse
    try {
        const cnames = await new Promise<string[]>((resolve, reject) => {
            dns.resolveCname(hostname, (err, data) => err ? reject(err) : resolve(data));
        });
        if (cnames && cnames.length > 0) {
            return await recursiveHybridResolve(cnames[0]);
        }
    } catch (e) {
        // Ignore and let it fall through to original lookup
    }

    throw new Error(`Failed to resolve ${hostname}`);
}

// Apply the global override
// @ts-ignore - overriding internal node dns function
dns.lookup = function (hostname: any, options: any, callback: any) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    // Always use original lookup for localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return originalLookup(hostname, options, callback);
    }

    recursiveHybridResolve(hostname)
        .then(res => {
            if (options.all) {
                callback(null, [{ address: res.address, family: res.family }]);
            } else {
                callback(null, res.address, res.family);
            }
        })
        .catch(() => {
            // Final fallback to original OS lookup
            originalLookup(hostname, options, callback);
        });
};

console.log("🚀 Robust DNS Fix initialized (Google DNS + Recursive CNAME Follower)");
