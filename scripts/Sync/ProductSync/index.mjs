import dotenv from "dotenv";
dotenv.config({ path: "./scripts/.env" });

import { processProducts } from "./Modules/processProducts.mjs";
import { findLatestCSV } from "./Modules/findLatestCSV.mjs";
import { getWooCommerceCategories } from "./Modules/getWooCommerceCategories.mjs";
import { getWooCommerceProducts } from "./Modules/getWooCommerceProducts.mjs";
import { parseCSV } from "./Modules/parseCSV.mjs";
import { mapProductBasics } from "./Modules/mapProductBasics.mjs";

export {
  processProducts,
  findLatestCSV,
  getWooCommerceCategories,
  getWooCommerceProducts,
  parseCSV,
  mapProductBasics,
};
