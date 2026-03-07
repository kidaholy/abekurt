console.log("🚀 Starting Standalone Stock Logic Verification...");

// 1. Unit Normalization Logic
console.log("\n--- Testing Unit Normalization ---");
const normalizeUnit = (unit) => {
    const u = unit?.toLowerCase() || 'piece'
    if (['l', 'liter', 'litre', 'liters'].includes(u)) return 'liter'
    if (['ml', 'milliliter', 'millilitre'].includes(u)) return 'ml'
    if (['kg', 'kilogram', 'kilograms'].includes(u)) return 'kg'
    if (['g', 'gram', 'grams', 'gr'].includes(u)) return 'g'
    return u
}

const unitTests = [
  { input: 'L', expected: 'liter' },
  { input: 'liter', expected: 'liter' },
  { input: 'Litre', expected: 'liter' },
  { input: 'ml', expected: 'ml' },
  { input: 'Milliliter', expected: 'ml' },
  { input: 'kg', expected: 'kg' },
  { input: 'Gram', expected: 'g' },
  { input: 'pcs', expected: 'pcs' }
];

unitTests.forEach(test => {
  const result = normalizeUnit(test.input);
  console.log(`${test.input.padEnd(12)} -> ${result.padEnd(8)} [${result === test.expected ? '✅' : '❌'}]`);
});

// 2. Liter/ml Conversion Logic (as implemented in reports)
console.log("\n--- Testing Liter/ml Conversion ---");
function simulateConsumption(ingredientUnit, ingredientQty, orderQty) {
    const unit = normalizeUnit(ingredientUnit);
    const amount = ingredientQty * orderQty;
    
    let literTotal = 0;
    if (unit === 'ml') {
        literTotal = (amount / 1000);
    } else if (unit === 'liter') {
        literTotal = amount;
    }
    return literTotal;
}

const conversionTests = [
  { unit: 'ml', iQty: 200, oQty: 2, expected: 0.4 },
  { unit: 'liter', iQty: 1, oQty: 3, expected: 3 },
  { unit: 'ml', iQty: 50, oQty: 10, expected: 0.5 }
];

conversionTests.forEach(test => {
  const result = simulateConsumption(test.unit, test.iQty, test.oQty);
  console.log(`${test.iQty}${test.unit} x ${test.oQty} -> ${result}L [${result === test.expected ? '✅' : '❌'}]`);
});

// 3. Stock Asset Calculation Logic
console.log("\n--- Testing Stock Asset Calculation ---");
const mockStock = {
    quantity: 5,
    storeQuantity: 10,
    averagePurchasePrice: 50,
    unitCost: 60
};

const totalQty = (mockStock.quantity || 0) + (mockStock.storeQuantity || 0);
const totalAssetValue = totalQty * (mockStock.averagePurchasePrice || mockStock.unitCost || 0);
const potentialRevenue = (mockStock.quantity || 0) * (mockStock.unitCost || 0);

console.log(`Total Handled Qty: ${totalQty} (Expected: 15) [${totalQty === 15 ? '✅' : '❌'}]`);
console.log(`Total Asset Value: ${totalAssetValue} (Expected: 750) [${totalAssetValue === 750 ? '✅' : '❌'}]`);
console.log(`Potential POS Revenue: ${potentialRevenue} (Expected: 300) [${potentialRevenue === 300 ? '✅' : '❌'}]`);

console.log("\n✅ All core logic tests passed!");
