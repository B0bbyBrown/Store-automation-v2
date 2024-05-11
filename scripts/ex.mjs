import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Transform } from "stream";
import csv from "csv-parser";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import axios from "axios";
import fsPromises from "fs/promises";

dotenv.config({ path: "./scripts/.env" });

const WooCommerce = new WooCommerceRestApi.default({
  url: process.env.WC_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: "wc/v3",
  wpAPI: true,
  axiosConfig: { timeout: 500000 },
});

const headers = {
  "Content-Type": "application/json",
  Authorization: `Basic ${Buffer.from(
    `${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`
  ).toString("base64")}`,
};

const categoryCache = {};

async function createOrRetrieveCategory(categoryName, parentCategoryId = null) {
  if (categoryCache[categoryName]) {
    return categoryCache[categoryName];
  }

  const slug = categoryName.toLowerCase().replace(/\s+/g, "-");
  const categoryUrl = `${process.env.WC_URL}/products/categories`;
  try {
    const response = await fetch(`${categoryUrl}?slug=${slug}`, {
      method: "GET",
      headers,
    });
    const categories = await response.json();

    if (categories.length) {
      categoryCache[categoryName] = categories[0].id;
      return categories[0].id;
    }

    const newCategory = { name: categoryName, parent: parentCategoryId, slug };
    const postResponse = await fetch(`${categoryUrl}`, {
      method: "POST",
      headers,
      body: JSON.stringify(newCategory),
    });

    if (postResponse.ok) {
      const data = await postResponse.json();
      categoryCache[categoryName] = data.id;
      return data.id;
    } else {
      throw new Error(
        `Failed to create category with status: ${postResponse.status}`
      );
    }
  } catch (error) {
    console.error(
      `Error in createOrRetrieveCategory: ${error.message || error}`
    );
    return null;
  }
}

async function mapProductToCategory(sku, categoryId) {
  try {
    const response = await fetch(`${process.env.WC_URL}/products?sku=${sku}`, {
      method: "GET",
      headers,
    });
    const product = (await response.json())[0];
    if (!product) throw new Error(`No product found with SKU: ${sku}`);

    const categories = product.categories.map((c) => ({ id: c.id }));
    categories.push({ id: categoryId });

    const updateResponse = await fetch(
      `${process.env.WC_URL}/products/${product.id}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ categories }),
      }
    );

    if (!updateResponse.ok)
      throw new Error(`Failed to update product with SKU: ${sku}`);
  } catch (error) {
    console.error(`Error in mapProductToCategory: ${error.message || error}`);
  }
}

async function deleteUnusedCategories(usedCategories) {
  try {
    const response = await fetch(`${process.env.WC_URL}/products/categories`, {
      method: "GET",
      headers,
    });
    const allCategories = await response.json();
    const categoriesToDelete = allCategories.filter(
      (cat) => !usedCategories.includes(cat.id)
    );

    for (const category of categoriesToDelete) {
      const deleteResponse = await fetch(
        `${process.env.WC_URL}/products/categories/${category.id}`,
        {
          method: "DELETE",
          headers,
        }
      );
      if (!deleteResponse.ok) {
        console.error(`Failed to delete category ID ${category.id}`);
      }
    }
  } catch (error) {
    console.error(`Error in deleteUnusedCategories: ${error.message || error}`);
  }
}

function formatMetaData(metaDataString) {
  return metaDataString.split(";").map((entry) => {
    const [key, value] = entry.split(":");
    return { key: key.trim(), value: value.trim() };
  });
}

function mapProductBasics(row) {
  const images = row.images
    ? row.images.split(";").map((image) => ({ src: image.trim() }))
    : [];
  const tags = row.tags
    ? row.tags.split(",").map((tag) => ({ name: tag.trim() }))
    : [];
  return {
    sku: row.sku,
    name: row.name,
    images,
    permalink: row.permalink,
    dimensions: {
      length: row.dimensions_length,
      width: row.dimensions_width,
      height: row.dimensions_height,
    },
    stock_quantity: parseInt(row.stock_quantity, 10) || 0,
    regular_price: row.regular_price,
    brand: row.brand,
    description: row.description || "",
    tags,
    meta_data: formatMetaData(row.meta_data || ""),
    weight: row.weight || "0",
    manage_stock: true,
    backorders: "no",
  };
}

function asyncTransform() {
  return new Transform({
    objectMode: true,
    async transform(chunk, encoding, callback) {
      try {
        const categories = Array.isArray(chunk.categories)
          ? chunk.categories
          : chunk.categories.split(",").map((cat) => cat.trim());
        const basicProduct = mapProductBasics(chunk);
        basicProduct.categories = await Promise.all(
          categories.map(createOrRetrieveCategory)
        );
        this.push(basicProduct);
        callback();
      } catch (error) {
        console.error(`Error in asyncTransform: ${error.message || error}`);
        callback(error);
      }
    },
  });
}

async function findLatestCSV(directoryPath) {
  try {
    let latestFile = null;
    let latestTime = 0;
    await fsPromises
      .readdir(directoryPath, { withFileTypes: true })
      .then((entries) => {
        entries.forEach((entry) => {
          const filePath = path.join(directoryPath, entry.name);
          if (entry.isDirectory()) {
            findLatestCSV(filePath);
          } else if (entry.name.endsWith(".csv")) {
            const fileStat = fs.statSync(filePath);
            if (fileStat.mtimeMs > latestTime) {
              latestFile = filePath;
              latestTime = fileStat.mtimeMs;
            }
          }
        });
      });
    return latestFile;
  } catch (error) {
    console.error(`Error in findLatestCSV: ${error.message || error}`);
    return null;
  }
}

async function parseCSV(csvFilePath) {
  const products = [];
  try {
    const stream = fs
      .createReadStream(csvFilePath)
      .pipe(csv({ headers: true }))
      .pipe(asyncTransform());
    for await (const product of stream) {
      products.push(product);
    }
    return products;
  } catch (error) {
    console.error(
      `Error parsing CSV file: ${csvFilePath}, ${error.message || error}`
    );
    return [];
  }
}

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
        updatedProducts.push({ ...storeProduct, ...updateData });
      }
    } else {
      newProducts.push(csvProduct);
    }

    return { newProducts, updatedProducts };
  }
};

async function uploadProducts(newProducts) {
  const batchSize = 10; // Smaller batch size to reduce server load
  for (let i = 0; i < newProducts.length; i += batchSize) {
    const batch = newProducts.slice(i, i + batchSize);

    try {
      const response = await WooCommerce.post("products/batch", {
        create: batch,
      });

      if (response.status !== 200) {
        console.error(`Error uploading batch: ${response.statusText}`);
        continue; // Skip to the next batch
      }
    } catch (error) {
      console.error("Error uploading products:", error);
      // Optionally add retry logic or alert mechanisms here
    }
  }
}

async function updateProducts(updatedProducts) {
  const batchSize = 100;
  for (let i = 0; i < updatedProducts.length; i += batchSize) {
    const batch = updatedProducts.slice(i, i + batchSize);

    try {
      await WooCommerce.post("products/batch", {
        update: batch,
      });
    } catch (error) {
      console.error("Error updating products:", error);
    }
  }
}

async function mainSync() {
  console.log("Starting synchronization process...");
  if (
    !process.env.WC_URL ||
    !process.env.WC_CONSUMER_KEY ||
    !process.env.WC_CONSUMER_SECRET
  ) {
    console.error(
      "Environment variables are missing. Please check your configuration."
    );
    return;
  }

  const directoryPath = "./output/final_filter/";
  const latestCSV = await findLatestCSV(directoryPath);
  if (!latestCSV) {
    console.error("No CSV files found in the directory.");
    return;
  }

  const csvProducts = await parseCSV(latestCSV);
  if (!csvProducts.length) {
    console.error("No products found in the CSV file.");
    return;
  }

  console.log(
    `Found ${csvProducts.length} products in CSV. Synchronizing with WooCommerce...`
  );
  try {
    const storeProducts = await getWooCommerceProducts();
    if (!storeProducts) {
      console.error("Failed to fetch products from WooCommerce.");
      return;
    }

    const { newProducts, updatedProducts } = await compareProducts(
      csvProducts,
      storeProducts
    );
    await uploadProducts(newProducts);
    await updateProducts(updatedProducts);
    console.log("Synchronization completed successfully.");
  } catch (error) {
    console.error(`Synchronization failed: ${error.message || error}`);
  }
}

mainSync();
