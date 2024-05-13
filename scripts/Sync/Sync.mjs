import dotenv from "dotenv";
import {
  findLatestCSV,
  parseCSV,
  getWooCommerceProducts,
  compareProducts,
  uploadProducts,
  updateProducts,
  deleteProducts,
} from "./Modules/SyncModules/SyncComponents.mjs";
import { setupCategories } from "./Modules/MappingModules/CategoryMapping.mjs";
import { handleAPIError } from "./Utils/errorHandling.mjs";

dotenv.config({ path: "./scripts/.env" });

async function synchronizeProducts() {
  console.log("Successfully connected to Woo API.");
  try {
    const csvProducts = await loadAndParseCSV("./output/final_filter/");
    if (!csvProducts) return;

    await setupProductCategories(csvProducts);
    await syncWithStore(csvProducts);
  } catch (error) {
    handleAPIError(
      error,
      "An error occurred during the synchronization process"
    );
  }
}

async function loadAndParseCSV(directoryPath) {
  const latestCSV = await findLatestCSV(directoryPath);
  if (!latestCSV) {
    console.error("No CSV file found.");
    return null;
  }
  const csvProducts = await parseCSV(latestCSV);
  if (!csvProducts.length) {
    console.error("No products found in CSV.");
    return null;
  }
  return csvProducts;
}

async function setupProductCategories(csvProducts) {
  const categoriesJson = csvProducts
    .map((product) => product.categories)
    .join();
  await setupCategories(categoriesJson);
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
  await uploadProducts(newProducts);
  await updateProducts(updatedProducts);
  await deleteProducts(productsToDelete);

  console.log("Product synchronization completed successfully.");
}

synchronizeProducts();
