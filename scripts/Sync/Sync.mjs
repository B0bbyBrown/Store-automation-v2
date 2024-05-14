import dotenv from "dotenv";
import {
  findLatestCSV,
  parseCSV,
  getWooCommerceProducts,
  getWooCommerceCategories,
  compareProducts,
  uploadProducts,
  updateProducts,
  deleteProducts,
} from "./Modules/SyncModules/SyncComponents.mjs";
import { handleAPIError } from "./Utils/errorHandling.mjs";

dotenv.config({ path: "./scripts/.env" });

async function mainSync() {
  console.log("Successfully connected to Woo API.");
  try {
    const wooCategories = await getWooCommerceCategories();
    console.log("WooCommerce Categories:", wooCategories);

    const csvProducts = await loadAndParseCSV(
      "./output/final_filter/",
      wooCategories
    );
    if (!csvProducts) return;

    await syncWithStore(csvProducts);
  } catch (error) {
    handleAPIError(
      error,
      "An error occurred during the synchronization process"
    );
  }
}

async function loadAndParseCSV(directoryPath, wooCategories) {
  const latestCSV = await findLatestCSV(directoryPath);
  if (!latestCSV) {
    console.error("No CSV file found.");
    return null;
  }
  const csvProducts = await parseCSV(latestCSV, wooCategories);
  if (!csvProducts.length) {
    console.error("No products found in CSV.");
    return null;
  }
  return csvProducts;
}

async function syncWithStore(csvProducts) {
  const storeProducts = await getWooCommerceProducts();
  if (!storeProducts) {
    console.error("Failed to fetch store products.");
    return;
  }

  console.log(
    `CSV file successfully processed with ${csvProducts.length} products.`
  );

  const { newProducts, updatedProducts, productsToDelete } = compareProducts(
    csvProducts,
    storeProducts
  );

  if (newProducts) console.log("New Products:", newProducts);
  if (updatedProducts) console.log("Updated Products:", updatedProducts);
  if (productsToDelete) console.log("Products to Delete:", productsToDelete);

  if (newProducts && newProducts.length > 0) await uploadProducts(newProducts);
  if (updatedProducts && updatedProducts.length > 0)
    await updateProducts(updatedProducts);
  if (productsToDelete && productsToDelete.length > 0)
    await deleteProducts(productsToDelete, storeProducts);

  console.log("Product synchronization completed successfully.");
}

mainSync();
