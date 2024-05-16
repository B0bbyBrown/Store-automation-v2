import { mapCategories } from "./mapCategories.mjs";
import { createCategory } from "./createCategory.mjs";
import { getWooCommerceCategories } from "../../ProductSync/Modules/getWooCommerceCategories.mjs";
const BATCH_SIZE = 50;

const setupCategories = async (csvProducts) => {
  try {
    const existingCategories = await getWooCommerceCategories();
    console.log(
      `Fetched ${existingCategories.length} existing categories from WooCommerce.`
    );

    const categoryNamesSet = new Set();
    csvProducts.forEach((product) => {
      if (Array.isArray(product.categories)) {
        product.categories.forEach((category) => {
          if (category && category.name) {
            categoryNamesSet.add(category.name);
          }
        });
      } else {
        console.error(
          "Product categories is not an array:",
          product.categories
        );
      }
    });

    const categoriesArray = Array.from(categoryNamesSet);
    //console.log("Unique category names:", categoriesArray);

    const mappedCategories = await mapCategories(categoriesArray);
    //console.log("Mapped categories:", mappedCategories);

    const createdCategories = {};

    for (let i = 0; i < mappedCategories.length; i += BATCH_SIZE) {
      const batch = mappedCategories.slice(i, i + BATCH_SIZE);
      const categoryPromises = batch.map(async (categoryData) => {
        const category = await createCategory(categoryData);
        if (category) {
          createdCategories[category.name] = category.id;
        }
      });
      await Promise.all(categoryPromises);
    }

    //console.log("Created categories with IDs:", createdCategories);

    csvProducts.forEach((product) => {
      if (Array.isArray(product.categories)) {
        product.categories = product.categories
          .map((cat) => {
            const categoryId = createdCategories[cat.name];
            return categoryId ? { id: categoryId, name: cat.name } : null;
          })
          .filter(Boolean);
      } else {
        console.error(
          "Product categories is not an array:",
          product.categories
        );
      }
      //console.log("Product after assigning category IDs:", product);
    });

    return csvProducts;
  } catch (error) {
    console.error("Error during category setup:" /*error*/);
    throw error;
  }
};

export { setupCategories };
