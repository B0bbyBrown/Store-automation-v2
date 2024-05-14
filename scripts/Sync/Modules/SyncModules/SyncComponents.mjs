// Import necessary modules
import fs from "fs";
import csv from "csv-parser";
import path from "path";
import fsPromises from "fs/promises";
import WooCommerceAPI from "../../Api/apiConfig.mjs";
import { Transform } from "stream";
import { handleAPIError } from "../../Utils/errorHandling.mjs";
import { mapProductBasics } from "../../Modules/MappingModules/ProductMapping.mjs";
import WooCommerce from "../../Api/apiConfig.mjs";

// Define asyncTransform
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

// Fetch all categories from WooCommerce
async function getWooCommerceCategories() {
  try {
    const response = await WooCommerce.get("products/categories");
    return response.data;
  } catch (error) {
    console.error("Error fetching WooCommerce categories:", error);
    throw error;
  }
}

// Find latest CSV file
async function findLatestCSV(directoryPath) {
  let latestFile = null;
  let latestTime = 0;

  async function traverseDirectories(directory) {
    const files = await fsPromises.readdir(directory);
    for (const file of files) {
      const filePath = path.join(directory, file);
      const fileStat = await fsPromises.stat(filePath);

      if (fileStat.isDirectory()) {
        await traverseDirectories(filePath);
      } else if (file.endsWith(".csv") && fileStat.mtimeMs > latestTime) {
        latestFile = filePath;
        latestTime = fileStat.mtimeMs;
      }
    }
  }

  await traverseDirectories(directoryPath);
  return latestFile;
}

// Parse CSV file and map categories to WooCommerce categories
async function parseCSV(filePath, categoryMap) {
  const products = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ delimiter: ",", columns: true }))
      .pipe(
        asyncTransform(async (row) => {
          const basicProduct = mapProductBasics(row, categoryMap);
          return basicProduct;
        })
      )
      .on("data", (product) => products.push(product))
      .on("end", () => resolve(products))
      .on("error", (error) => {
        console.error("Error parsing CSV file:", filePath, error);
        reject(error);
      });
  });
}

// Get WooCommerce products
async function getWooCommerceProducts() {
  try {
    const response = await WooCommerceAPI.get("products");
    return response.data;
  } catch (error) {
    handleAPIError(error, "Failed to retrieve products", {
      canRetry: true,
      retryCount: 0,
      callback: getWooCommerceProducts,
    });
  }
}

// Define product field mapping
const productFieldMapping = {
  // Add specific field mappings if necessary
};

// Compare Products
const compareProducts = (csvProducts, storeProducts) => {
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
        updatedProducts.push({ id: storeProduct.id, ...updateData });
      }
    } else {
      newProducts.push(csvProduct);
    }
  }

  return { newProducts, updatedProducts, productsToDelete: [] };
};

// Upload Products
const uploadProducts = async (newProducts) => {
  const batchSize = 100;
  for (let i = 0; i < newProducts.length; i += batchSize) {
    const batch = newProducts.slice(i, i + batchSize);
    console.log("Uploading products batch:", JSON.stringify(batch, null, 2));
    try {
      await WooCommerce.post("products/batch", { create: batch });
    } catch (error) {
      console.error("Error uploading products:", error);
    }
  }
};

// Update Products
const updateProducts = async (updatedProducts) => {
  const batchSize = 100;
  for (let i = 0; i < updatedProducts.length; i += batchSize) {
    const batch = updatedProducts.slice(i, i + batchSize);
    console.log("Updating products batch:", JSON.stringify(batch, null, 2));
    try {
      await WooCommerce.post("products/batch", { update: batch });
    } catch (error) {
      console.error("Error updating products:", error);
    }
  }
};

// Delete Products
const deleteProducts = async (deletedSKUs, storeProducts) => {
  const productsToDelete = storeProducts.filter((product) =>
    deletedSKUs.includes(product.sku)
  );
  const batchSize = 100;
  for (let i = 0; i < productsToDelete.length; i += batchSize) {
    const batch = productsToDelete
      .slice(i, i + batchSize)
      .map((product) => product.id);
    try {
      await WooCommerce.delete("products/batch", {
        delete: batch,
        force: true,
      });
      console.log(`Deleted ${batch.length} product(s).`);
    } catch (error) {
      console.error("Error deleting products:", error);
    }
  }
};

export {
  asyncTransform,
  findLatestCSV,
  parseCSV,
  getWooCommerceProducts,
  getWooCommerceCategories,
  compareProducts,
  uploadProducts,
  updateProducts,
  deleteProducts,
};
