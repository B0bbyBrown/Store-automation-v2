// sync.mjs

import {
  findLatestCSV,
  parseCSV,
  setupCategories,
  fetchExistingCategories,
  getWooCommerceProducts,
  mapProductBasics,
  processProducts,
  uploadProductsInBatches,
} from "./index.mjs";

async function mainSync() {
  try {
    console.log("Starting synchronization process...");

    // Fetch latest CSV data
    const csvFilePath = await findLatestCSV("./output/final_filter");
    console.log(`Found latest CSV file: ${csvFilePath}`);
    const csvData = await parseCSV(csvFilePath);
    console.log(
      `CSV file successfully processed with ${csvData.length} products.`
    );

    // Fetch existing categories from WooCommerce
    const existingCategories = await fetchExistingCategories();
    console.log(
      `Fetched ${existingCategories.length} existing categories from WooCommerce.`
    );

    // Set up categories in WooCommerce
    const csvDataWithCategories = await setupCategories(csvData);
    console.log("CSV data after category setup:", csvDataWithCategories);

    // Fetch existing products from WooCommerce
    const storeProducts = await getWooCommerceProducts();
    console.log(`Fetched ${storeProducts.length} products from WooCommerce.`);

    // Map product basics before processing
    const mappedProducts = csvDataWithCategories.map(mapProductBasics);
    console.log("Mapped products:", mappedProducts);

    // Process products for synchronization
    await processProducts(mappedProducts, storeProducts);

    // Upload products in batches with delay
    await uploadProductsInBatches(mappedProducts);

    console.log("Synchronization process completed successfully.");
  } catch (error) {
    console.error("Error during synchronization process:", error);
  }
}

mainSync();
