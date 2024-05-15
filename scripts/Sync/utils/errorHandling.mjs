function handleAPIError(error, message, retryOptions) {
  console.error(message, error);
  if (retryOptions && retryOptions.canRetry && retryError.retryCount < 3) {
    setTimeout(retryOptions.callback, 2000); // Retry after 2 seconds
  } else {
    throw new Error(`Failed after retries: ${message}`);
  }
}

const retryRequest = async (fn, retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retrying request... Attempt ${i + 1}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export { handleAPIError, retryRequest };
