import dotenv from "dotenv";
dotenv.config({ path: "./scripts/.env" });

import { compareProducts } from "./Modules/compareProducts.mjs";
import { processProducts } from "./Modules/processProducts.mjs";
import { uploadProducts } from "./Modules/uploadProducts.mjs";
import { updateProducts } from "./Modules/updateProducts.mjs";
import { deleteProducts } from "./Modules/deleteProducts.mjs";
import { findLatestCSV } from "./Modules/findLatestCSV.mjs";
import { getWooCommerceCategories } from "./Modules/getWooCommerceCategories.mjs";
import { getWooCommerceProducts } from "./Modules/getWooCommerceProducts.mjs";
import { parseCSV } from "./Modules/parseCSV.mjs";
import { mapProductBasics } from "./Modules/mapProductBasics.mjs";

export {
  compareProducts,
  processProducts,
  uploadProducts,
  updateProducts,
  deleteProducts,
  findLatestCSV,
  getWooCommerceCategories,
  getWooCommerceProducts,
  parseCSV,
  mapProductBasics,
};
