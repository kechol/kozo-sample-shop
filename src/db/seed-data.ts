export const seedCategories = [
  {
    slug: "kitchen",
    name: "Kitchen",
    description: "Cookware and tools for everyday cooking.",
  },
  {
    slug: "coffee",
    name: "Coffee & Tea",
    description: "Brewing gear for the morning ritual.",
  },
  {
    slug: "outdoor",
    name: "Outdoor",
    description: "Gear for weekend trips and long walks.",
  },
  {
    slug: "stationery",
    name: "Stationery",
    description: "Paper, pens and desk companions.",
  },
  {
    slug: "home",
    name: "Home",
    description: "Small things that make a room feel lived in.",
  },
] as const;

type CategorySlug = (typeof seedCategories)[number]["slug"];

export const seedProducts: {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  category: CategorySlug;
}[] = [
  {
    slug: "cast-iron-skillet-10",
    name: 'Cast Iron Skillet 10"',
    description:
      "Pre-seasoned skillet that holds heat evenly for searing and baking.",
    priceCents: 4200,
    stock: 25,
    category: "kitchen",
  },
  {
    slug: "chef-knife-8",
    name: 'Chef Knife 8"',
    description: "Stainless steel blade with a balanced walnut handle.",
    priceCents: 6800,
    stock: 12,
    category: "kitchen",
  },
  {
    slug: "bamboo-cutting-board",
    name: "Bamboo Cutting Board",
    description: "Reversible board with a juice groove on one side.",
    priceCents: 2400,
    stock: 40,
    category: "kitchen",
  },
  {
    slug: "linen-apron",
    name: "Linen Apron",
    description: "Washed linen apron with two deep pockets.",
    priceCents: 3200,
    stock: 18,
    category: "kitchen",
  },
  {
    slug: "enamel-dutch-oven",
    name: "Enamel Dutch Oven 5qt",
    description: "Heavy enamelled pot for braises, soups and bread.",
    priceCents: 11900,
    stock: 6,
    category: "kitchen",
  },
  {
    slug: "wooden-spoon-set",
    name: "Wooden Spoon Set",
    description: "Three olive wood spoons in different sizes.",
    priceCents: 1800,
    stock: 60,
    category: "kitchen",
  },
  {
    slug: "pour-over-dripper",
    name: "Ceramic Pour-Over Dripper",
    description: "Single-cup dripper with spiral ribs for an even extraction.",
    priceCents: 2600,
    stock: 30,
    category: "coffee",
  },
  {
    slug: "gooseneck-kettle",
    name: "Gooseneck Kettle",
    description: "Stovetop kettle with a slim spout for a controlled pour.",
    priceCents: 5400,
    stock: 14,
    category: "coffee",
  },
  {
    slug: "hand-grinder",
    name: "Hand Coffee Grinder",
    description: "Conical burr grinder with 30 click settings.",
    priceCents: 8900,
    stock: 9,
    category: "coffee",
  },
  {
    slug: "glass-teapot",
    name: "Glass Teapot",
    description: "Heat-resistant glass teapot with a removable infuser.",
    priceCents: 3400,
    stock: 20,
    category: "coffee",
  },
  {
    slug: "paper-filters-100",
    name: "Paper Filters (100)",
    description: "Unbleached cone filters sized for most drippers.",
    priceCents: 700,
    stock: 200,
    category: "coffee",
  },
  {
    slug: "travel-tumbler",
    name: "Travel Tumbler",
    description: "Double-walled tumbler that keeps drinks hot for six hours.",
    priceCents: 2900,
    stock: 0,
    category: "coffee",
  },
  {
    slug: "daypack-20l",
    name: "Daypack 20L",
    description: "Water-resistant pack with a padded laptop sleeve.",
    priceCents: 7900,
    stock: 15,
    category: "outdoor",
  },
  {
    slug: "camp-stove",
    name: "Compact Camp Stove",
    description: "Folding canister stove that boils a litre in four minutes.",
    priceCents: 4900,
    stock: 11,
    category: "outdoor",
  },
  {
    slug: "trekking-poles",
    name: "Trekking Poles (Pair)",
    description: "Aluminium poles with cork grips and quick locks.",
    priceCents: 6400,
    stock: 8,
    category: "outdoor",
  },
  {
    slug: "headlamp",
    name: "Rechargeable Headlamp",
    description: "300-lumen headlamp with a red night mode.",
    priceCents: 3600,
    stock: 35,
    category: "outdoor",
  },
  {
    slug: "wool-socks",
    name: "Merino Hiking Socks",
    description: "Cushioned merino socks for long days on the trail.",
    priceCents: 1900,
    stock: 80,
    category: "outdoor",
  },
  {
    slug: "insulated-bottle",
    name: "Insulated Bottle 750ml",
    description: "Steel bottle with a leak-proof loop cap.",
    priceCents: 3100,
    stock: 3,
    category: "outdoor",
  },
  {
    slug: "dot-grid-notebook",
    name: "Dot Grid Notebook A5",
    description: "Lay-flat notebook with 160 pages of 100gsm paper.",
    priceCents: 1600,
    stock: 120,
    category: "stationery",
  },
  {
    slug: "fountain-pen",
    name: "Steel Nib Fountain Pen",
    description: "Medium nib pen with a converter and two cartridges.",
    priceCents: 4500,
    stock: 16,
    category: "stationery",
  },
  {
    slug: "gel-pens-6",
    name: "Gel Pens (6)",
    description: "Quick-drying 0.5mm gel pens in black.",
    priceCents: 900,
    stock: 150,
    category: "stationery",
  },
  {
    slug: "desk-organizer",
    name: "Desk Organizer",
    description: "Oak tray with three compartments for pens and cards.",
    priceCents: 3800,
    stock: 10,
    category: "stationery",
  },
  {
    slug: "washi-tape-set",
    name: "Washi Tape Set",
    description: "Five rolls of patterned paper tape.",
    priceCents: 1200,
    stock: 45,
    category: "stationery",
  },
  {
    slug: "linen-throw",
    name: "Linen Throw Blanket",
    description: "Stonewashed linen throw in natural oat.",
    priceCents: 8800,
    stock: 7,
    category: "home",
  },
  {
    slug: "ceramic-vase",
    name: "Ceramic Bud Vase",
    description: "Hand-glazed vase for a single stem.",
    priceCents: 2200,
    stock: 22,
    category: "home",
  },
  {
    slug: "soy-candle",
    name: "Soy Candle — Cedar",
    description: "Forty-hour candle with a cotton wick.",
    priceCents: 2000,
    stock: 50,
    category: "home",
  },
  {
    slug: "wall-clock",
    name: "Minimal Wall Clock",
    description: "Silent sweep clock with a birch face.",
    priceCents: 4600,
    stock: 5,
    category: "home",
  },
  {
    slug: "cotton-doormat",
    name: "Woven Cotton Doormat",
    description: "Machine-washable mat with a non-slip back.",
    priceCents: 2700,
    stock: 0,
    category: "home",
  },
];

// Test-only accounts for local development, tests and kozo's verify-app. Never reuse these
// passwords anywhere real.
export const seedAccounts = [
  {
    name: "Sample Buyer",
    email: "buyer@example.com",
    password: "buyer-password-123",
  },
  {
    name: "Sample Admin",
    email: "admin@example.com",
    password: "admin-password-123",
  },
] as const;
