import { mapCategories } from "./mapCategories.mjs";
import { createCategory } from "./createCategory.mjs";

const setupCategories = async (csvProducts) => {
  try {
    // Step 1: Extract unique category names
    const categoryNamesSet = new Set();
    csvProducts.forEach((product) => {
      product.categories.forEach((category) => {
        categoryNamesSet.add(category.name);
      });
    });

    const categoriesArray = Array.from(categoryNamesSet);
    const categoriesJson = JSON.stringify(categoriesArray);

    console.log("Unique category names:", categoriesArray);

    // Step 2: Map categories
    const mappedCategories = await mapCategories(categoriesJson);
    console.log("Mapped categories:", mappedCategories);

    const createdCategories = {};

    // Step 3: Create categories if they don't exist
    for (let categoryData of mappedCategories) {
      const category = await createCategory(categoryData);
      if (category) {
        createdCategories[category.name] = category.id;
      }
    }

    console.log("Created categories with IDs:", createdCategories);

    // Step 4: Assign created category IDs to products
    csvProducts.forEach((product) => {
      product.categories = product.categories.map((cat) => {
        return {
          id: createdCategories[cat.name],
          name: cat.name,
        };
      });
      console.log("Product after assigning category IDs:", product);
    });

    console.log("All categories successfully mapped and created or found.");
    return csvProducts;
  } catch (error) {
    console.error("Error during category setup:", error);
    throw error;
  }
};

export { setupCategories };
