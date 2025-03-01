import { mockProducts } from "../mock/mockProducts";

export function getProductsById(id: string | undefined | null) {
  if (!id) return null;

  const product = mockProducts.find((product) => product.id === id);
  if (!product) return null;

  return product;
}
