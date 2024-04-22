import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config({ path: "./scripts/.env" });

const categoryCache = {};

// Create category
async function createCategory(categoryName, parentCategoryId) {
  if (categoryCache[categoryName]) {
    return categoryCache[categoryName];
  }

  const newCategory = { name: categoryName, parent: parentCategoryId };
  try {
    const response = await fetch(
      `${process.env.WC_URL}/wp-json/wc/v3/products/categories`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCategory),
      }
    );

    const data = await response.json();
    if (response.ok) {
      categoryCache[categoryName] = data.id;
      return data.id;
    } else {
      throw new Error(
        `Failed to create category: ${data.message || "Unknown error"}`
      );
    }
  } catch (error) {
    console.error("Error creating category:", error);
    throw error; // Ensuring that errors are propagated up the stack
  }
}

// Map categories
async function mapCategories(csvCategories) {
  const categories = [];
  const categoryNames = csvCategories.split(" > ");
  let parentCategoryId = null;

  for (const categoryName of categoryNames) {
    const categoryId = await createCategory(categoryName, parentCategoryId);
    categories.push({ id: categoryId, name: categoryName });
    parentCategoryId = categoryId; // Set for next category in the hierarchy
  }

  return categories;
}

//format metadata
function formatMetaData(csvMetaData) {
  const metaData = [];
  csvMetaData.split(";").forEach((item) => {
    const [key, value] = item.split(":").map((part) => part.trim());
    if (key && value) {
      metaData.push({ key, value });
    }
  });
  return metaData;
}

function formatAttributes(csvDescription, csvTags, csvMetaData) {
  const attributes = [];

  // Handle brand extraction
  addBrandAttribute(csvDescription, attributes);

  // Handle tags
  addTagAttributes(csvTags, attributes);

  // Handle meta data
  addMetaDataAttributes(csvMetaData, attributes);

  return attributes;
}

function addBrandAttribute(description, attributes) {
  const brandMatch = description.match(/brand:\s*(.+)/i);
  if (brandMatch && brandMatch[1]) {
    attributes.push({
      name: "Brand",
      options: [brandMatch[1].trim()],
      visible: true,
    });
  } else {
    console.log("No brand extracted from description:", description);
  }
}

function addTagAttributes(tags, attributes) {
  tags
    .split(",")
    .filter((tag) => tag.trim())
    .forEach((tag) => {
      attributes.push({ name: tag.trim(), options: [tag], visible: true });
    });
}

function addMetaDataAttributes(metaData, attributes) {
  metaData
    .split(",")
    .filter((keyword) => keyword.trim())
    .forEach((keyword) => {
      attributes.push({ name: keyword, options: [keyword], visible: true });
    });
}

// Extend mapProductBasics to include dimensions and custom attributes
function mapProductBasics(row) {
  const images = row.images.split(";").map((image) => ({ src: image.trim() }));
  return {
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    images: images,
    permalink: row.permalink,
    regular_price: row.regular_price,
    description: row.description,
    tags: row.tags.split(",").map((tag) => tag.trim()),
    dimensions: {
      length: row.dimensions_length,
      width: row.dimensions_width,
      height: row.dimensions_height,
    },
    weight: row.weight,
    meta_data: [
      ...formatMetaData(row.meta_data),
      { key: "barcode", value: row.barcode },
      { key: "minimum_allowed_quantity", value: row.minimum_allowed_quantity },
      { key: "date_expected", value: row.date_expected },
      { key: "erp_status", value: row.erp_status },
    ],
    stock_quantity:
      parseInt(row.stock_quantity) > 0 ? parseInt(row.stock_quantity) : null,
    manage_stock: true,
    backorders: "no",
    attributes: formatAttributes(
      row.description,
      row.tags,
      `${row.attribute};${row.is_essential};${row.is_accessory};${row.is_spare}`
    ),
  };
}

export {
  mapProductBasics,
  mapCategories,
  formatAttributes,
  createCategory,
  formatMetaData,
};
