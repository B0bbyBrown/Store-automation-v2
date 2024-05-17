import WooCommerce from "../../Api/apiConfig.mjs";

const createCategory = async (categoryData) => {
  try {
    const response = await WooCommerce.post(
      "products/categories",
      categoryData
    );
    return response.data;
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
  }
};

export { createCategory };
