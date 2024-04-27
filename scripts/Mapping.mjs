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
    categoryCache[categoryName] = data.id;
    return data.id;
  } catch (error) {
    console.error("Error creating category:", error);
    return null; // Handle as you see fit for your error management strategy
  }
}

// Delete unused catagories
async function deleteUnusedCategories(usedCategories) {
  const allCategories = await fetch(
    `${process.env.WC_URL}/wp-json/wc/v3/products/categories`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`
        ).toString("base64")}`,
      },
    }
  ).then((res) => res.json());

  const categoriesToDelete = allCategories.filter(
    (cat) => !usedCategories.includes(cat.id)
  );

  for (const category of categoriesToDelete) {
    await fetch(
      `${process.env.WC_URL}/wp-json/wc/v3/products/categories/${category.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`
          ).toString("base64")}`,
        },
      }
    );
  }
}

// Map categories
// Assumes category information is structured as [{id: "Category > Subcategory > Sub-subcategory"}, ...]
async function mapCategories(categoryJson) {
  const categories = JSON.parse(categoryJson);
  let parentCategoryId = null;

  for (const category of categories) {
    let categoryPath = category.id.split(" > ");
    for (let categoryName of categoryPath) {
      parentCategoryId = await createCategory(categoryName, parentCategoryId);
    }
  }

  return parentCategoryId; // Return the ID of the last category in the hierarchy for product association
}

//format metadata
function formatMetaData(metaDataString) {
  const metaData = [];
  const entries = metaDataString.split(";");
  entries.forEach((entry) => {
    const [key, value] = entry.split(":");
    if (key && value) {
      metaData.push({ key: key.trim(), value: value.trim() });
    }
  });
  return metaData;
}

const productFieldMapping = {
  sku: "sku",
  name: "name",
  images: "images",
  permalink: "permalink",
  dimensions_length: "dimensions.length",
  dimensions_width: "dimensions.width",
  dimensions_height: "dimensions.height",
  stock_quantity: "stock_quantity",
  regular_price: "regular_price",
  brand: "brand",
  description: "description",
  tags: "tags",
  meta_data: "meta_data",
  weight: "weight",
  // Add other mappings as necessary
};

//Map Products
function mapProductBasics(row) {
  const images = row.images
    ? row.images.split(";").map((image) => ({ src: image.trim() }))
    : [];
  const brand = row.brand || "Unknown Brand";
  const tags = row.tags
    ? row.tags.split(",").map((tag) => ({ name: tag.trim() }))
    : [];

  const stockQuantity = parseInt(row.stock_quantity) || 0;

  return {
    sku: row.sku,
    name: row.name,
    images: images,
    permalink: row.permalink,
    dimensions: {
      length: row.dimensions_length,
      width: row.dimensions_width,
      height: row.dimensions_height,
    },
    stock_quantity: stockQuantity,
    regular_price: row.regular_price,
    brand: row.brand,
    description: row.description || "",
    tags: tags,
    meta_data: formatMetaData(row.meta_data || ""),
    weight: row.weight || "0",
    manage_stock: true,
    backorders: "no",
  };
}

export {
  deleteUnusedCategories,
  mapProductBasics,
  mapCategories,
  createCategory,
  formatMetaData,
  productFieldMapping,
};
