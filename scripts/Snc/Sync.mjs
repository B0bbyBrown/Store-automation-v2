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
import { setupCategories } from "./Modules/MappingModules/CategoryMapping.mjs";
import { handleAPIError } from "./Utils/errorHandling.mjs";

dotenv.config({ path: "./scripts/.env" });

//Main function to synchronize products
async function synchronizeProducts() {
  console.log("Successfully connected to Woo API.");
  try {
    const latestCSV = await findLatestCSV("./output/final_filter/");
    if (!latestCSV) {
      console.error("No CSV file found.");
      return;
    }

    const wooCategories = await getWooCommerceCategories();
    const categoryMap = await setupCategories(wooCategories);

    const csvProducts = await parseCSV(latestCSV, categoryMap);
    if (!csvProducts.length) {
      console.error("No products found in CSV.");
      return;
    }

    await syncWithStore(csvProducts);
  } catch (error) {
    handleAPIError(
      error,
      "An error occurred during the synchronization process"
    );
  }
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
  const { newProducts, updatedProducts, productsToDelete } =
    await compareProducts(csvProducts, storeProducts);
  if (newProducts && newProducts.length > 0) {
    await uploadProducts(newProducts);
  }
  if (updatedProducts && updatedProducts.length > 0) {
    await updateProducts(updatedProducts);
  }
  if (productsToDelete && productsToDelete.length > 0) {
    await deleteProducts(productsToDelete, storeProducts);
  }

  console.log("Product synchronization completed successfully.");
}

synchronizeProducts();
