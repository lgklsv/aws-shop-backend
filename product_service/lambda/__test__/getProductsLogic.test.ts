import { getProductsList } from "../logic/getProductsLogic";
import { mockProducts } from "../mock/mockProducts";

describe("getProductsList", () => {
  it("should return the list of mock products", () => {
    const products = getProductsList();
    expect(products).toEqual(mockProducts);
  });
});
