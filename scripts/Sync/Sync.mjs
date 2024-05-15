import WooCommerce from "./Api/apiConfig.mjs";
import { setupCategories } from "./CategorySync/index.mjs";
import {
  processProducts,
  mapProductBasics,
  findLatestCSV,
  parseCSV,
} from "./ProductSync/index.mjs";
import { handleAPIError } from "./utils/errorHandling.mjs";

const mainSync = async () => {
  console.log("Starting synchronization process...");

  const csvDirectoryPath = "./output/final_filter";

  let csvFilePath;
  try {
    csvFilePath = await findLatestCSV(csvDirectoryPath); // Await the function
  } catch (error) {
    console.error("Error finding the latest CSV file:", error);
    return;
  }

  console.log("Found latest CSV file:", csvFilePath);

  const csvProducts = [];
  try {
    const parsedCsv = await parseCSV(csvFilePath);
    for (const row of parsedCsv) {
      // Parse categories back to array
      if (row.categories) {
        row.categories = JSON.parse(row.categories);
      }
      const product = mapProductBasics(row);
      if (product) {
        csvProducts.push(product);
      }
    }
  } catch (error) {
    console.error("Error parsing CSV file:", error);
    return;
  }

  console.log(
    "CSV file successfully processed with",
    csvProducts.length,
    "products."
  );

  // Log categories before setup
  csvProducts.forEach((product) => {
    console.log("Product categories before setup:", product.categories);
  });

  try {
    const updatedProducts = await setupCategories(csvProducts);

    // Log categories after setup
    updatedProducts.forEach((product) => {
      console.log("Product categories after setup:", product.categories);
    });

    const response = await WooCommerce.get("products", { per_page: 100 });
    const storeProducts = response.data;

    await processProducts(updatedProducts, storeProducts);
  } catch (error) {
    handleAPIError(error, "Error during synchronization process");
  }
};

mainSync();
