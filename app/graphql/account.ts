// ─── Types ───────────────────────────────────────────────────────────────────

export interface CustomerAddress {
  id: string;
  fullName: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: { name: string; code: string };
  phoneNumber?: string;
  defaultShippingAddress: boolean;
  defaultBillingAddress: boolean;
}

export interface CustomerProfile {
  id: string;
  title?: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
  addresses: CustomerAddress[];
}

export interface CustomerOrderLine {
  id: string;
  quantity: number;
  unitPriceWithTax: number;
  linePriceWithTax: number;
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
}

export interface CustomerOrder {
  id: string;
  code: string;
  state: string;
  totalWithTax: number;
  currencyCode: string;
  orderPlacedAt: string | null;
  lines: Array<{
    id: string;
    quantity: number;
    featuredAsset: { preview: string } | null;
    productVariant: {
      id: string;
      name: string;
      product: { name: string; slug: string };
    };
  }>;
}

export interface CustomerOrderDetail {
  id: string;
  code: string;
  state: string;
  totalWithTax: number;
  subTotalWithTax: number;
  shippingWithTax: number;
  currencyCode: string;
  orderPlacedAt: string | null;
  couponCodes: string[];
  discounts: { description: string; amountWithTax: number }[];
  shippingAddress: {
    fullName: string;
    streetLine1: string;
    streetLine2?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    phoneNumber?: string;
  } | null;
  lines: CustomerOrderLine[];
  payments: {
    id: string;
    state: string;
    method: string;
    amount: number;
  }[];
}

export interface CustomerProfileData {
  activeCustomer: CustomerProfile | null;
}

export interface CustomerOrdersData {
  activeCustomer: {
    orders: {
      items: CustomerOrder[];
      totalItems: number;
    };
  } | null;
}

export interface CustomerOrderDetailData {
  order: CustomerOrderDetail | null;
}

export interface UpdateCustomerResult {
  updateCustomer: {
    id: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneNumber?: string;
  };
}

export interface UpdateCustomerPasswordResult {
  updateCustomerPassword: {
    __typename: string;
    success?: boolean;
    message?: string;
    validationErrorMessage?: string;
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const GET_CUSTOMER_PROFILE_QUERY = `
  query GetCustomerProfile {
    activeCustomer {
      id
      title
      firstName
      lastName
      emailAddress
      phoneNumber
      addresses {
        id
        fullName
        streetLine1
        streetLine2
        city
        province
        postalCode
        country { name code }
        phoneNumber
        defaultShippingAddress
        defaultBillingAddress
      }
    }
  }
`;

export const GET_CUSTOMER_ORDERS_QUERY = `
  query GetCustomerOrders($skip: Int, $take: Int) {
    activeCustomer {
      orders(options: { skip: $skip, take: $take, sort: { orderPlacedAt: DESC } }) {
        items {
          id
          code
          state
          totalWithTax
          currencyCode
          orderPlacedAt
          lines {
            id
            quantity
            featuredAsset { preview }
            productVariant {
              id
              name
              product { name slug }
            }
          }
        }
        totalItems
      }
    }
  }
`;

export const GET_ORDER_DETAIL_QUERY = `
  query GetOrderDetail($id: ID!) {
    order(id: $id) {
      id
      code
      state
      totalWithTax
      subTotalWithTax
      shippingWithTax
      currencyCode
      orderPlacedAt
      couponCodes
      discounts {
        description
        amountWithTax
      }
      shippingAddress {
        fullName
        streetLine1
        streetLine2
        city
        province
        postalCode
        country
        phoneNumber
      }
      lines {
        id
        quantity
        unitPriceWithTax
        linePriceWithTax
        featuredAsset { preview }
        productVariant {
          id
          name
          sku
          product { name slug featuredAsset { preview } }
        }
      }
      payments {
        id
        state
        method
        amount
      }
    }
  }
`;

// ─── Mutations ───────────────────────────────────────────────────────────────

export const UPDATE_CUSTOMER_MUTATION = `
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      id
      firstName
      lastName
      emailAddress
      phoneNumber
    }
  }
`;

export const UPDATE_CUSTOMER_PASSWORD_MUTATION = `
  mutation UpdateCustomerPassword($currentPassword: String!, $newPassword: String!) {
    updateCustomerPassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      __typename
      ... on Success { success }
      ... on InvalidCredentialsError { errorCode message }
      ... on PasswordValidationError { errorCode message validationErrorMessage }
      ... on NativeAuthStrategyError { errorCode message }
    }
  }
`;

export const REQUEST_PASSWORD_RESET_MUTATION = `
  mutation RequestPasswordReset($emailAddress: String!) {
    requestPasswordReset(emailAddress: $emailAddress) {
      __typename
      ... on Success { success }
      ... on NativeAuthStrategyError { errorCode message }
    }
  }
`;

export const RESET_PASSWORD_MUTATION = `
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password) {
      __typename
      ... on CurrentUser { id identifier }
      ... on PasswordResetTokenInvalidError { errorCode message }
      ... on PasswordResetTokenExpiredError { errorCode message }
      ... on PasswordValidationError { errorCode message validationErrorMessage }
      ... on NativeAuthStrategyError { errorCode message }
      ... on NotVerifiedError { errorCode message }
    }
  }
`;

export interface SocialLoginResult {
  authenticate: {
    __typename: string;
    id?: string;
    identifier?: string;
    errorCode?: string;
    message?: string;
  };
}

export const SOCIAL_LOGIN_MUTATION = `
  mutation SocialLogin($input: AuthenticationInput!) {
    authenticate(input: $input) {
      __typename
      ... on CurrentUser {
        id
        identifier
      }
      ... on InvalidCredentialsError {
        errorCode
        message
      }
      ... on NotVerifiedError {
        errorCode
        message
      }
    }
  }
`;

export const VERIFY_CUSTOMER_ACCOUNT_MUTATION = `
  mutation VerifyCustomerAccount($token: String!, $password: String) {
    verifyCustomerAccount(token: $token, password: $password) {
      __typename
      ... on CurrentUser { id identifier }
      ... on VerificationTokenInvalidError { errorCode message }
      ... on VerificationTokenExpiredError { errorCode message }
      ... on MissingPasswordError { errorCode message }
      ... on PasswordValidationError { errorCode message validationErrorMessage }
      ... on NativeAuthStrategyError { errorCode message }
      ... on PasswordAlreadySetError { errorCode message }
    }
  }
`;
