export const CART_COUNT_QUERY = `
  query GetCartCount {
    activeOrder {
      totalQuantity
    }
  }
`;

export interface OrderLineItem {
  id: string;
  quantity: number;
  unitPriceWithTax: number;
  linePriceWithTax: number;
  discountedLinePriceWithTax: number;
  featuredAsset: { preview: string } | null;
  productVariant: {
    id: string;
    name: string;
    sku: string;
    product: {
      name: string;
      slug: string;
      featuredAsset: { preview: string } | null;
    };
  };
  customFields?: {
    bundleGroupId?: string | null;
    bundleDefinitionId?: string | null;
    bundleName?: string | null;
  } | null;
}

export interface OrderDiscount {
  description: string;
  amount: number;
  amountWithTax: number;
}

export interface ActiveOrder {
  id: string;
  code: string;
  state: string;
  totalQuantity: number;
  currencyCode: string;
  subTotalWithTax: number;
  shippingWithTax: number;
  totalWithTax: number;
  lines: OrderLineItem[];
  discounts: OrderDiscount[];
  couponCodes: string[];
}

export interface ActiveOrderData {
  activeOrder: ActiveOrder | null;
  bundleGroups?: import("./bundle").BundleGroup[];
}

// ─── Add to cart ─────────────────────────────────────────────────────────────

type OrderLines = Array<{
  id: string;
  quantity: number;
  linePrice: number;
  discountedLinePriceWithTax: number;
  productVariant: { name: string; product: { name: string } };
}>;

export interface AddToCartOrderResult {
  __typename: "Order";
  id: string;
  totalQuantity: number;
  totalWithTax: number;
  lines: OrderLines;
  discounts: Array<{ description: string; amount: number }>;
}

export interface InsufficientStockError {
  __typename: "InsufficientStockError";
  errorCode: string;
  message: string;
  quantityAvailable: number;
  order: {
    id: string;
    totalQuantity: number;
    totalWithTax: number;
    lines: OrderLines;
    discounts: Array<{ description: string; amount: number }>;
  };
}

export interface OrderModificationError {
  __typename: "OrderModificationError";
  errorCode: string;
  message: string;
}

export interface OrderLimitError {
  __typename: "OrderLimitError";
  errorCode: string;
  message: string;
  maxItems: number;
}

export interface NegativeQuantityError {
  __typename: "NegativeQuantityError";
  errorCode: string;
  message: string;
}

export type AddToCartResultUnion =
  | AddToCartOrderResult
  | InsufficientStockError
  | OrderModificationError
  | OrderLimitError
  | NegativeQuantityError;

export interface AddToCartResult {
  addItemToOrder: AddToCartResultUnion;
}

export interface AddToCartVariables {
  productVariantId: string;
  quantity: number;
}

export function getAddToCartErrorMessage(result: AddToCartResultUnion): string | null {
  switch (result.__typename) {
    case "Order":
      return null;
    case "InsufficientStockError":
      return result.quantityAvailable > 0
        ? `Only ${result.quantityAvailable} item${result.quantityAvailable === 1 ? "" : "s"} available — added what we could`
        : "This item is currently out of stock";
    case "OrderLimitError":
      return `Order limit reached (max ${result.maxItems} items per order)`;
    case "NegativeQuantityError":
      return "Quantity must be at least 1";
    case "OrderModificationError":
      return "Cannot modify this order — please refresh and try again";
    default:
      return "Could not add item to cart";
  }
}

export const ADD_TO_CART_MUTATION = `
  mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      __typename
      ... on Order {
        id
        lines {
          id
          productVariant { name product { name } }
          quantity
          linePrice
          discountedLinePriceWithTax
        }
        totalQuantity
        totalWithTax
        discounts { description amount }
      }
      ... on InsufficientStockError {
        errorCode
        message
        quantityAvailable
        order {
          id
          totalQuantity
          totalWithTax
          lines {
            id
            productVariant { name product { name } }
            quantity
            linePrice
            discountedLinePriceWithTax
          }
          discounts { description amount }
        }
      }
      ... on OrderModificationError { errorCode message }
      ... on OrderLimitError { errorCode message maxItems }
      ... on NegativeQuantityError { errorCode message }
    }
  }
`;

// ─── Adjust order line ───────────────────────────────────────────────────────

export interface AdjustOrderLineVariables {
  orderLineId: string;
  quantity: number;
}

export interface AdjustOrderLineResult {
  adjustOrderLine: AddToCartResultUnion;
}

export const ADJUST_ORDER_LINE_MUTATION = `
  mutation AdjustOrderLine($orderLineId: ID!, $quantity: Int!) {
    adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
      __typename
      ... on Order {
        id
        totalQuantity
        subTotalWithTax
        shippingWithTax
        totalWithTax
        currencyCode
        lines {
          id
          quantity
          unitPriceWithTax
          linePriceWithTax
          discountedLinePriceWithTax
          featuredAsset { preview }
          productVariant {
            id name sku
            product { name slug featuredAsset { preview } }
          }
        }
      }
      ... on InsufficientStockError { errorCode message quantityAvailable }
      ... on OrderModificationError { errorCode message }
      ... on OrderLimitError { errorCode message maxItems }
      ... on NegativeQuantityError { errorCode message }
    }
  }
`;

// ─── Remove order line ────────────────────────────────────────────────────────

export interface RemoveOrderLineVariables {
  orderLineId: string;
}

export interface RemoveOrderLineResult {
  removeOrderLine: { __typename: "Order" } & Omit<ActiveOrder, "code" | "state"> | { __typename: "OrderModificationError"; errorCode: string; message: string };
}

export const REMOVE_ORDER_LINE_MUTATION = `
  mutation RemoveOrderLine($orderLineId: ID!) {
    removeOrderLine(orderLineId: $orderLineId) {
      __typename
      ... on Order {
        id
        totalQuantity
        subTotalWithTax
        shippingWithTax
        totalWithTax
        currencyCode
        lines {
          id
          quantity
          unitPriceWithTax
          linePriceWithTax
          featuredAsset { preview }
          productVariant {
            id name sku
            product { name slug featuredAsset { preview } }
          }
        }
      }
      ... on OrderModificationError { errorCode message }
    }
  }
`;

// ─── Remove cart item (bundle-aware) ─────────────────────────────────────────

export interface RemoveCartItemVariables {
  lineId: string;
}

export interface RemoveCartItemResult {
  removeCartItem: {
    success: boolean;
    bundleCascaded: boolean;
  };
}

export const REMOVE_CART_ITEM_MUTATION = `
  mutation RemoveCartItem($lineId: ID!) {
    removeCartItem(lineId: $lineId) {
      success
      bundleCascaded
    }
  }
`;

// ─── Active order ─────────────────────────────────────────────────────────────

export const ACTIVE_ORDER_QUERY = `
  query GetActiveOrder {
    activeOrder {
      id
      code
      state
      totalQuantity
      currencyCode
      subTotalWithTax
      shippingWithTax
      totalWithTax
      couponCodes
      discounts { 
        description
        amount
        amountWithTax
      }
      lines {
        id
        quantity
        unitPriceWithTax
        linePriceWithTax
        discountedLinePriceWithTax
        featuredAsset { preview }
        productVariant {
          id
          name
          sku
          product {
            name
            slug
            featuredAsset { preview }
          }
        }
        customFields { bundleGroupId bundleDefinitionId bundleName }
      }
    }
  }
`;
