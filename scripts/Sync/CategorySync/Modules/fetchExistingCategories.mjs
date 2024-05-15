import WooCommerce from "../../Api/apiConfig.mjs";

const fetchExistingCategories = async () => {
  try {
    const response = await WooCommerce.get("products/categories", {
      per_page: 100,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching existing categories:", error);
    throw error;
  }
};

export { fetchExistingCategories };
