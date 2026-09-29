import { requestJson } from './api-request';

type ProductImageResponse = { imageUrl: string };

export function uploadCommerceProductImage(
  productId: string,
  image: File,
  isNewProduct: boolean,
): Promise<ProductImageResponse> {
  const formData = new FormData();
  formData.append('image', image);
  const encodedId = encodeURIComponent(productId);
  const path = isNewProduct
    ? `/commerce/product-images/${encodedId}`
    : `/commerce/products/${encodedId}/image`;

  return requestJson<ProductImageResponse>(path, {
    method: 'POST',
    body: formData,
  }, {
    fallbackMessage: 'La photo du produit n’a pas pu être téléversée.',
  });
}