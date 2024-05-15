import WooCommerce from "../../Api/apiConfig.mjs";

const getWooCommerceCategories = async () => {
  try {
    const response = await WooCommerce.get("products/categories", {
      per_page: 100,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching WooCommerce categories:", error);
    return [];
  }
};

export { getWooCommerceCategories };
