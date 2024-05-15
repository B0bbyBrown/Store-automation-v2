import WooCommerce from "../../Api/apiConfig.mjs";

const createCategory = async (categoryData) => {
  console.log("Creating or finding category:", categoryData.name);

  try {
    const response = await WooCommerce.get("products/categories", {
      search: categoryData.name,
    });

    if (response.data && response.data.length > 0) {
      // If the category already exists, return the existing category
      return response.data[0];
    } else {
      // If the category does not exist, create a new one
      const newCategory = await WooCommerce.post(
        "products/categories",
        categoryData
      );
      return newCategory.data;
    }
  } catch (error) {
    console.error("Error creating or finding category:", error);
    return null;
  }
};

export { createCategory };
