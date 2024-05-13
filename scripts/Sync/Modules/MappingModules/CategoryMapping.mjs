import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

// Initialize WooCommerce API
const WooCommerce = new WooCommerceRestApi.default({
  url: process.env.WC_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: "wc/v3",
});

function transformCategoryNameToSlug(categoryName) {
  return categoryName
    .toLowerCase() // Convert to lower case
    .trim() // Remove leading and trailing whitespace
    .replace(/&/g, "and") // Replace '&' with 'and'
    .replace(/[\s\W-]+/g, "-"); // Replace spaces, non-word characters, and dashes with a single dash
}

// Validate categories
function isValidCategory(category) {
  return category && category.name && category.name.trim() !== "";
}

// Map categories
async function mapCategories(categoriesJson) {
  console.log("Received categories:", categoriesJson); // Debug statement
  console.log("Type of categoriesJson:", typeof categoriesJson); // Debug type
  if (!categoriesJson) {
    console.error("No categories JSON provided");
    return [];
  }

  let categories;
  try {
    categories =
      typeof categoriesJson === "string"
        ? JSON.parse(categoriesJson)
        : categoriesJson;

    if (!Array.isArray(categories) || categories.length === 0) {
      console.warn("Categories JSON is empty or not an array");
      return [];
    }
  } catch (error) {
    console.error("Failed to parse categories JSON", error);
    return [];
  }

  return categories
    .filter(isValidCategory) // Validate category
    .map((cat) => ({
      name: cat.name,
      slug: transformCategoryNameToSlug(cat.name),
    }));
}

// Create or find category
async function createCategory(categoryData) {
  console.log("Creating or finding category:", categoryData.name);

  try {
    const response = await WooCommerce.get("products/categories", {
      search: categoryData.name,
    });

    if (response.data && response.data.length > 0) {
      return response.data[0].name;
    } else {
      // Create new category if not found
      const newCategory = await WooCommerce.post(
        "products/categories",
        categoryData
      );
      return newCategory.data.name;
    }
  } catch (error) {
    console.error("Error creating or finding category:", error);
    return null;
  }
}

// Delete unused categories
async function deleteUnusedCategories(usedCategoryNames) {
  try {
    const allCategories = await WooCommerce.get("products/categories");
    const categoriesToDelete = allCategories.data.filter(
      (cat) => !usedCategoryNames.includes(cat.name)
    );

    for (const category of categoriesToDelete) {
      await WooCommerce.delete(`products/categories/${category.name}`, {
        force: true, // Ensures the category is permanently deleted
      });
      console.log(`Deleted category: ${category.name}`);
    }
  } catch (error) {
    console.error("Error deleting unused categories:", error);
  }
}

const setupCategories = async (categoryJson) => {
  try {
    const mappedCategories = await mapCategories(categoryJson);
    const categoryNames = [];

    for (let categoryData of mappedCategories) {
      const categoryNames = await createCategory(categoryData);
      if (categoryNames) {
        categoryNames.push(categoryNames);
      }
    }

    console.log("All categories successfully mapped and created or found.");
    await deleteUnusedCategories(categoryNames);
    console.log("Unused categories cleaned up successfully.");
  } catch (error) {
    console.error("Error during category setup:", error);
    throw error;
  }
};

export {
  mapCategories,
  createCategory,
  deleteUnusedCategories,
  setupCategories,
};
