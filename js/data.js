/* ===== Dummy data (fictional). Replace with API responses later. =====
   Units: price in USD, weight in kg, volume in m³.
   Relationships use IDs only: product.companyId -> company.id */

const COMPANIES = [
  { id: "COM-001", name: "Indus Textiles Ltd." },
  { id: "COM-002", name: "Karakoram Electronics" },
  { id: "COM-003", name: "Sindh Agro Foods" },
  { id: "COM-004", name: "Mehran Home Appliances" }
];

const PRODUCTS = [
  // Indus Textiles Ltd.
  { id: "PRD-1001", name: "Cotton Fabric Rolls",   companyId: "COM-001", price: 18500, weight: 2400, volume: 9.5 },
  { id: "PRD-1002", name: "Denim Bales",           companyId: "COM-001", price: 14200, weight: 1800, volume: 7.2 },
  { id: "PRD-1003", name: "Bed Linen Cartons",     companyId: "COM-001", price: 9800,  weight: 650,  volume: 5.8 },
  { id: "PRD-1004", name: "Towel Packs",           companyId: "COM-001", price: 6400,  weight: 520,  volume: 4.6 },
  { id: "PRD-1005", name: "Embroidered Shawls",    companyId: "COM-001", price: 11200, weight: 240,  volume: 2.4 },

  // Karakoram Electronics
  { id: "PRD-2001", name: "LED Television Panels", companyId: "COM-002", price: 42000, weight: 1100, volume: 8.8 },
  { id: "PRD-2002", name: "Smartphone Cartons",    companyId: "COM-002", price: 68000, weight: 180,  volume: 1.6 },
  { id: "PRD-2003", name: "Laptop Batteries",      companyId: "COM-002", price: 24500, weight: 420,  volume: 2.2 },
  { id: "PRD-2004", name: "Wireless Routers",      companyId: "COM-002", price: 15800, weight: 260,  volume: 3.1 },
  { id: "PRD-2005", name: "Solar Inverters",       companyId: "COM-002", price: 36500, weight: 1450, volume: 5.4 },

  // Sindh Agro Foods
  { id: "PRD-3001", name: "Basmati Rice Sacks",    companyId: "COM-003", price: 21000, weight: 6000, volume: 9.0 },
  { id: "PRD-3002", name: "Canned Mango Pulp",     companyId: "COM-003", price: 12600, weight: 3200, volume: 5.5 },
  { id: "PRD-3003", name: "Dried Dates Cartons",   companyId: "COM-003", price: 8900,  weight: 1500, volume: 4.2 },
  { id: "PRD-3004", name: "Cooking Oil Drums",     companyId: "COM-003", price: 17400, weight: 4800, volume: 6.3 },
  { id: "PRD-3005", name: "Spice Mix Packs",       companyId: "COM-003", price: 5200,  weight: 700,  volume: 3.4 },

  // Mehran Home Appliances
  { id: "PRD-4001", name: "Refrigerators",         companyId: "COM-004", price: 52000, weight: 3600, volume: 18.0 },
  { id: "PRD-4002", name: "Washing Machines",      companyId: "COM-004", price: 39000, weight: 3000, volume: 14.5 },
  { id: "PRD-4003", name: "Microwave Ovens",       companyId: "COM-004", price: 16500, weight: 900,  volume: 6.8 },
  { id: "PRD-4004", name: "Ceiling Fans",          companyId: "COM-004", price: 7800,  weight: 480,  volume: 4.0 },
  { id: "PRD-4005", name: "Water Dispensers",      companyId: "COM-004", price: 13400, weight: 750,  volume: 5.2 }
];

const CONTAINERS = [
  { id: "CNT-01", name: "20ft Standard",  maxWeight: 28000, maxVolume: 33 },
  { id: "CNT-02", name: "40ft Standard",  maxWeight: 26500, maxVolume: 67 },
  { id: "CNT-03", name: "40ft High Cube", maxWeight: 26000, maxVolume: 76 },
  { id: "CNT-04", name: "20ft Reefer",    maxWeight: 27000, maxVolume: 28 },
  { id: "CNT-05", name: "45ft High Cube", maxWeight: 25500, maxVolume: 86 }
];

// Capacity unit: m³ (same unit as product volume)
const WAREHOUSES = [
  { id: "WH-01", name: "Karachi Port Warehouse",   location: "Karachi, Sindh",     totalCapacity: 5000, occupiedCapacity: 3800, availableCapacity: 1200 },
  { id: "WH-02", name: "Lahore Dry Port Depot",    location: "Lahore, Punjab",     totalCapacity: 4000, occupiedCapacity: 2500, availableCapacity: 1500 },
  { id: "WH-03", name: "Faisalabad Hub",           location: "Faisalabad, Punjab", totalCapacity: 3000, occupiedCapacity: 2900, availableCapacity: 100  },
  { id: "WH-04", name: "Multan Distribution Yard", location: "Multan, Punjab",     totalCapacity: 3500, occupiedCapacity: 1000, availableCapacity: 2500 }
];
