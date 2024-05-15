import WooCommerce from "../../Api/apiConfig.mjs";

const createCategory = async (categoryData) => {
  console.log("Creating or finding category:", categoryData.name);

  try {
    const response = await WooCommerce.get("products/categories", {
      search: categoryData.name,
    });

    if (response.data && response.data.length > 0) {
      return response.data[0]; // Return the existing category
    } else {
      const newCategory = await WooCommerce.post(
        "products/categories",
        categoryData
      );
      return newCategory.data; // Return the newly created category
    }
  } catch (error) {
    console.error("Error creating or finding category:", error);
    return null;
  }
};

export { createCategory };
