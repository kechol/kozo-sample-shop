import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    // Prices are integer minor units (cents) so totals never accumulate floating-point error.
    priceCents: integer("price_cents").notNull(),
    stock: integer("stock").notNull().default(0),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("products_category_id_idx").on(table.categoryId),
    check("products_price_cents_positive", sql`${table.priceCents} > 0`),
    check("products_stock_non_negative", sql`${table.stock} >= 0`),
  ],
);

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.cartId, table.productId] }),
    check("cart_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "payment_failed",
]);

export const orders = pgTable(
  "orders",
  {
    // A random UUID, so the order page URL cannot be guessed from another order.
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id").references(() => carts.id, {
      onDelete: "set null",
    }),
    status: orderStatus("status").notNull().default("pending_payment"),
    email: text("email").notNull(),
    shippingName: text("shipping_name").notNull(),
    shippingAddress: text("shipping_address").notNull(),
    shippingCity: text("shipping_city").notNull(),
    shippingPostalCode: text("shipping_postal_code").notNull(),
    shippingCountry: text("shipping_country").notNull(),
    totalCents: integer("total_cents").notNull(),
    paymentChargeId: text("payment_charge_id"),
    paymentFailureCode: text("payment_failure_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("orders_total_cents_positive", sql`${table.totalCents} > 0`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    // Name and price are copied so later catalog edits never change a placed order.
    productName: text("product_name").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderStatus = Order["status"];
