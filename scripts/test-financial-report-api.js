const fetch = require('node-fetch');

async function testApi() {
  const token = process.env.AUTH_TOKEN;
  if (!token) {
    console.error("AUTH_TOKEN environment variable is required");
    process.exit(1);
  }

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const url = `http://localhost:3000/api/reports/sales?period=custom&startDate=${dateStr}&endDate=${dateStr}`;

  console.log(`Testing API with URL: ${url}`);

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      console.log("API Response Summary:");
      console.log(`Period: ${data.period}`);
      console.log(`Start Date: ${data.startDate}`);
      console.log(`End Date: ${data.endDate}`);
      console.log(`Total Revenue: ${data.summary.totalRevenue}`);
      console.log(`Orders Count: ${data.summary.totalOrders}`);
      
      if (data.startDate.startsWith(dateStr) && data.endDate.includes('23:59:59')) {
        console.log("✅ Date range correctly applied!");
      } else {
        console.log("❌ Date range mismatch!");
      }
    } else {
      console.error(`API Error: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.error(text);
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testApi();
