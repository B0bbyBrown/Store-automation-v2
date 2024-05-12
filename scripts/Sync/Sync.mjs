import axios from "axios";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import fs from "fs";
import fsPromises from "fs/promises";
import csv from "csv-parser";
import dotenv from "dotenv";
import { Transform } from "stream";
import path from "path";

dotenv.config({ path: "./scripts/.env" });

const WooCommerce = new WooCommerceRestApi.default({
  url: process.env.WC_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: "wc/v3",
  axiosConfig: { timeout: 500000 },
});

import {
  mapProductBasics,
  mapCategories,
  productFieldMapping,
} from "./scripts/Sync/Modules/MappingModules/CategoryMapping.mjs";

function handleError(error, message, options) {
  console.error(`${message}:`, error);
  if (options.canRetry && options.retryCount < 3) {
    console.log(`Retrying... Attempt ${options.retryCount + 1}`);
    setTimeout(options.callback, 1000 * (options.retryCount + 1), {
      ...options,
      retryCount: options.retryCount + 1, // Ensure increment
    });
  }
}

function asyncTransform(operation) {
  return new Transform({
    objectMode: true,
    async transform(chunk, encoding, callback) {
      try {
        const result = await operation(chunk);
        this.push(result);
        callback();
      } catch (error) {
        console.error("Error during async transformation:", error);
        callback(null);
      }
    },
  });
}

// Function to find the latest CSV file in a directory and its subdirectories
async function findLatestCSV(convertedDirectoryPath) {
  let latestFile = null;
  let latestTime = 0;

  async function traverseDirectories(output) {
    const files = await fsPromises.readdir(output);
    for (const file of files) {
      const filePath = path.join(output, file);
      const fileStat = await fsPromises.stat(filePath);

      if (fileStat.isDirectory()) {
        await traverseDirectories(filePath);
      } else if (file.endsWith(".csv") && fileStat.mtimeMs > latestTime) {
        latestFile = filePath;
        latestTime = fileStat.mtimeMs;
      }
    }
  }

  await traverseDirectories(convertedDirectoryPath);
  return latestFile;
}

//Parse CSV
async function parseCSV(csvFilePath) {
  const products = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv({ delimiter: ",", columns: true }))
      .pipe(
        asyncTransform(async (row) => {
          const categories = await mapCategories(row.categories); // Process categories
          const basicProduct = mapProductBasics(row); // Basic mapping

          return { ...basicProduct, categories }; // Merge categories into the product object
        })
      )
      .on("data", (product) => products.push(product))
      .on("end", () => resolve(products))
      .on("error", (error) => {
        console.error("Error parsing CSV file:", csvFilePath, error);
        reject(error);
      });
  });
}

//get Products from Store
async function getWooCommerceProducts() {
  try {
    const response = await axios.get(
      `${process.env.WC_URL}/wp-json/wc/v3/products`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`
          ).toString("base64")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to retrieve products:", error);
    return null;
  }
}

console.log("Products retrieved");

const setupCategories = async (categoryJson) => {
  try {
    // Map categories from the provided JSON (or CSV converted to JSON)
    const usedCategoryIds = await mapCategories(categoryJson);
    console.log(`All categories successfully mapped.`);

    // Optionally, gather used categories for cleanup
    const usedCategories = categoryJson.map((cat) => cat.id);

    await deleteUnusedCategories(usedCategoryIds);
    console.log("Unused categories cleaned up successfully.");
  } catch (error) {
    console.error("Error during category setup:", error);
    throw error;
  }
};

console.log("Comparing Products to CSV");

//Compare Products
const compareProducts = async (csvProducts, storeProducts) => {
  const newProducts = [];
  const updatedProducts = [];
  const existingSKUs = new Set(storeProducts.map((product) => product.sku));

  for (const csvProduct of csvProducts) {
    const { sku, ...csvFields } = csvProduct;

    if (existingSKUs.has(sku)) {
      const storeProduct = storeProducts.find((product) => product.sku === sku);
      let hasDifference = false;

      for (const field in csvFields) {
        const wooCommerceField = productFieldMapping[field] || field;
        if (csvProduct[field] !== storeProduct[wooCommerceField]) {
          hasDifference = true;
          break;
        }
      }

      if (hasDifference) {
        const updateData = {};
        for (const field in csvFields) {
          const wooCommerceField = productFieldMapping[field] || field;
          if (csvProduct[field] !== storeProduct[wooCommerceField]) {
            updateData[wooCommerceField] = csvProduct[field];
          }
        }
        await WooCommerce.put(`products/${storeProduct.id}`, updateData);
        updatedProducts.push(storeProduct);
      }
    } else {
      newProducts.push(csvProduct);
    }
  }

  return { newProducts, updatedProducts };
};

console.log("Products Compared");
console.log("Uploading Products");

//Upload
const uploadProducts = async (newProducts) => {
  const batchSize = 100;
  for (let i = 0; i < newProducts.length; i += batchSize) {
    const batch = newProducts.slice(i, i + batchSize);
    try {
      const response = await WooCommerce.post("products/batch", {
        create: batch,
      });
      //console.log(`Uploaded ${batch.length} product(s).`);
    } catch (error) {
      handleError(error, "Error uploading products", {
        name: "uploadProducts",
        canRetry: true,
        retryCount: 0,
        callback: () => uploadProducts(batch),
      });
    }
  }
};

//Update products
const updateProducts = async (updatedProducts) => {
  const batchSize = 100;
  for (let i = 0; i < updatedProducts.length; i += batchSize) {
    const batch = updatedProducts.slice(i, i + batchSize);
    try {
      const response = await WooCommerce.post("products/batch", {
        update: batch,
      });
      //console.log(`Updated ${batch.length} product(s).`);
    } catch (error) {
      handleError(error, "Error updating products", {
        name: "updateProducts",
        canRetry: true,
        retryCount: 0,
        callback: () => updateProducts(batch),
      });
    }
  }
};

console.log("Products updated");

console.log("Deleting products");

// Delete
const deleteProducts = async (deletedSKUs) => {
  const productsToDelete = storeProducts.filter((product) =>
    deletedSKUs.includes(product.sku)
  );
  const batchSize = 100;
  for (let i = 0; i < productsToDelete.length; i += batchSize) {
    const batch = productsToDelete
      .slice(i, i + batchSize)
      .map((product) => product.id);
    try {
      const response = await WooCommerce.delete("products/batch", {
        delete: batch,
        force: true,
      });
      console.log(`Deleted ${batch.length} product(s).`);
    } catch (error) {
      handleError(error, "Error deleting products", {
        name: "deleteProducts",
        canRetry: true,
        retryCount: 0,
        callback: () => deleteProducts(batch),
      });
    }
  }
};

console.log("Products deleted");

// Main Method
async function mainSync() {
  console.log("Connecting to Woo API");
  if (
    !process.env.WC_URL ||
    !process.env.WC_CONSUMER_KEY ||
    !process.env.WC_CONSUMER_SECRET
  ) {
    console.error(
      "Missing environment variables: WC_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET. Check your .env file."
    );
    return;
  }

  console.log("Successfully connected to Woo API.");

  try {
    const convertedDirectoryPath = "./output/final_filter";
    const latestCSV = await findLatestCSV(convertedDirectoryPath);
    if (!latestCSV) {
      console.error("No CSV file found.");
      return;
    }

    const csvProducts = await parseCSV(latestCSV);
    if (!csvProducts.length) {
      console.error("No products found in CSV.");
      return;
    }

    // Assuming you need to setup categories based on your CSV before uploading products
    await setupCategories(csvProducts);

    const storeProducts = await getWooCommerceProducts();
    if (!storeProducts) {
      console.error("Failed to fetch store products.");
      return;
    }

    console.log(
      `CSV file successfully processed with ${csvProducts.length} products.`
    );
    const { newProducts, updatedProducts } = await compareProducts(
      csvProducts,
      storeProducts
    );

    await uploadProducts(newProducts);
    await updateProducts(updatedProducts);

    console.log("Product synchronization completed successfully.");
  } catch (error) {
    console.error(
      "An error occurred during the synchronization process:",
      error
    );
  }
}

mainSync();
