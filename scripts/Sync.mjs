import fs from "fs";
import csv from "csv-parser";
import axios from "axios";
import dotenv from "dotenv";
import { Transform } from "stream";
import path from "path";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import {
  mapProductBasics,
  formatAttributes,
  formatMetaData,
} from "./Mapping.mjs";

dotenv.config({ path: "./scripts/.env" });

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
    process.exit(1);
  }

  const WooCommerce = new WooCommerceRestApi.default({
    url: process.env.WC_URL,
    consumerKey: process.env.WC_CONSUMER_KEY,
    consumerSecret: process.env.WC_CONSUMER_SECRET,
    version: "wc/v3",
    axiosConfig: { timeout: 10000 },
  });

  console.log("Successfully connected to Woo API.");

  const rootDirPath = process.env.CSV_DIRECTORY || "./output/woo_rephrase";
  const latestCSV = findLatestCSV(rootDirPath);

  if (!latestCSV) {
    console.error("No CSV files found in the directory:", rootDirPath);
    return;
  }

  console.log(`CSV file found: ${latestCSV.filePath}`);
  try {
    const csvProducts = await parseCSV(latestCSV.filePath);
    console.log(
      `CSV file successfully processed with ${csvProducts.length} products.`
    );

    const storeProducts = await getWooCommerceProducts();
    const { newProducts, updatedProducts, deletedSKUs } = await compareProducts(
      csvProducts,
      storeProducts
    );

    await uploadProducts(newProducts);
    await updateProducts(updatedProducts);
    await deleteProducts(deletedSKUs);

    console.log("Product synchronization completed successfully.");
  } catch (error) {
    console.error("An error occurred during processing:", error);
  }
}

//Main Method
mainSync();

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
        callback(error);
      }
    },
  });
}

//Find Latest CSV
function findLatestCSV(rootDirPath) {
  try {
    let latestCSV = null;
    let latestModificationTime = 0;
    const files = fs.readdirSync(rootDirPath);
    files.forEach((file) => {
      const filePath = path.join(rootDirPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        const subdirectoryLatestCSV = findLatestCSV(filePath);
        if (
          subdirectoryLatestCSV &&
          subdirectoryLatestCSV.modificationTime > latestModificationTime
        ) {
          latestCSV = subdirectoryLatestCSV;
          latestModificationTime = subdirectoryLatestCSV.modificationTime;
        }
      } else if (
        stats.isFile() &&
        file.toLowerCase().endsWith(".csv") &&
        stats.mtimeMs > latestModificationTime
      ) {
        latestCSV = { filePath, modificationTime: stats.mtimeMs };
        latestModificationTime = stats.mtimeMs;
      }
    });
    return latestCSV;
  } catch (error) {
    console.error("Error searching for CSV in directory:", rootDirPath, error);
    return null;
  }
}

//Parse CSV
async function parseCSV(csvFilePath) {
  const products = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv({ delimiter: ",", columns: true }))
      .pipe(
        asyncTransform(async (row) => {
          const basicProduct = mapProductBasics(row);
          basicProduct.attributes = formatAttributes(
            row.description,
            row.tags,
            row.meta_data
          );
          basicProduct.meta_data = formatMetaData(row.meta_data);
          return basicProduct;
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

// Additional functions remain unchanged for brevity

console.log("All Done!");

brand;
//get Products from Store
async function getWooCommerceProducts() {
  let retryCount = 0;
  const maxRetries = 3;
  const retryDelay = 1000;

  while (retryCount < maxRetries) {
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

      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(
          `Error retrieving products: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        console.error(
          "Error retrieving products from WooCommerce, maximum retries reached",
          error
        );
        break;
      }
      console.log(`Retrying... Attempt ${retryCount}`);
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * retryCount)
      );
    }
  }
}

console.log("Products retrieved");

console.log("Comparing Products to CSV");

let brandCategories = {};

//Find or Create Category
const findOrCreateCategory = async (brandName) => {
  if (!brandName) {
    console.error("Brand name is undefined or empty.");
    return null;
  }

  const slug = brandName.toLowerCase().replace(/\s+/g, "-");

  if (brandCategories[slug]) {
    return brandCategories[slug];
  }

  try {
    const response = await WooCommerce.get("products/categories", { slug });
    const existingCategory = response.data;

    if (existingCategory && existingCategory.length > 0) {
      brandCategories[slug] = existingCategory[0].id;
      return existingCategory[0].id;
    } else {
      const newCategoryResponse = await WooCommerce.post(
        "products/categories",
        {
          name: brandName,
          slug,
        }
      );
      const newCategory = newCategoryResponse.data;
      brandCategories[slug] = newCategory.id;
      return newCategory.id;
    }
  } catch (error) {
    console.error("Failed to find or create category:", error);
    throw error;
  }
};

//Compare Products
const compareProducts = async (csvProducts, storeProducts) => {
  const newProducts = [];
  const updatedProducts = [];
  const existingSKUs = new Set(storeProducts.map((product) => product.sku));

  const tasks = csvProducts.map(async (csvProduct) => {
    const { sku, ...csvFields } = csvProduct;
    const productBrand = csvProduct.csv_brand;
    const categoryId = await findOrCreateCategory(productBrand);
    csvProduct.categories = [{ id: categoryId }];

    if (existingSKUs.has(sku)) {
      const storeProduct = storeProducts.find((product) => product.sku === sku);
      let hasDifference = false;
      for (const field in csvFields) {
        const wooCommerceField = productFieldMapping[field] || field;
        if (csvFields[field] !== storeProduct[wooCommerceField]) {
          hasDifference = true;
          break;
        }
      }

      if (hasDifference) {
        const updateData = Object.keys(csvFields).reduce((acc, field) => {
          const wooCommerceField = productFieldMapping[field] || field;
          if (csvFields[field] !== storeProduct[wooCommerceField]) {
            acc[wooCommerceField] = csvFields[field];
          }
          return acc;
        }, {});

        await WooCommerce.put(`products/${storeProduct.id}`, updateData);
        updatedProducts.push(storeProduct);
      }
    } else {
      newProducts.push(csvProduct);
    }
  });

  await Promise.all(tasks);
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
      console.log(`Uploaded ${batch.length} product(s).`);
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
      console.log(`Updated ${batch.length} product(s).`);
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

console.log("All Done!");
