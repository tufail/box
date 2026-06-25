// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ActiveCustomer {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  priceWithTax: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  isEligible: boolean;
  eligibilityMessage: string | null;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const ACTIVE_CUSTOMER_QUERY = `
  query GetActiveCustomer {
    activeCustomer {
      id
      firstName
      lastName
      emailAddress
    }
  }
`;

export const ELIGIBLE_SHIPPING_METHODS_QUERY = `
  query GetEligibleShippingMethods {
    eligibleShippingMethods {
      id
      name
      description
      price
      priceWithTax
    }
  }
`;

export const ELIGIBLE_PAYMENT_METHODS_QUERY = `
  query GetEligiblePaymentMethods {
    eligiblePaymentMethods {
      id
      name
      code
      isEligible
      eligibilityMessage
    }
  }
`;

// ── Mutations ─────────────────────────────────────────────────────────────────

export const LOGIN_MUTATION = `
  mutation Login($username: String!, $password: String!, $rememberMe: Boolean) {
    login(username: $username, password: $password, rememberMe: $rememberMe) {
      __typename
      ... on CurrentUser {
        id
        identifier
      }
      ... on InvalidCredentialsError { errorCode message }
      ... on NotVerifiedError { errorCode message }
      ... on NativeAuthStrategyError { errorCode message }
    }
  }
`;

export const REGISTER_MUTATION = `
  mutation RegisterCustomerAccount($input: RegisterCustomerInput!) {
    registerCustomerAccount(input: $input) {
      __typename
      ... on Success { success }
      ... on MissingPasswordError { errorCode message }
      ... on PasswordValidationError { errorCode message validationErrorMessage }
      ... on NativeAuthStrategyError { errorCode message }
    }
  }
`;

export const SET_CUSTOMER_FOR_ORDER_MUTATION = `
  mutation SetCustomerForOrder($input: CreateCustomerInput!) {
    setCustomerForOrder(input: $input) {
      __typename
      ... on Order { id state }
      ... on AlreadyLoggedInError { errorCode message }
      ... on EmailAddressConflictError { errorCode message }
      ... on GuestCheckoutError { errorCode message errorDetail }
      ... on NoActiveOrderError { errorCode message }
    }
  }
`;

export const SET_SHIPPING_ADDRESS_MUTATION = `
  mutation SetOrderShippingAddress($input: CreateAddressInput!) {
    setOrderShippingAddress(input: $input) {
      __typename
      ... on Order {
        id
        state
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
      }
      ... on NoActiveOrderError { errorCode message }
    }
  }
`;

export const SET_SHIPPING_METHOD_MUTATION = `
  mutation SetOrderShippingMethod($shippingMethodId: [ID!]!) {
    setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
      __typename
      ... on Order {
        id
        state
        shippingWithTax
        totalWithTax
        subTotalWithTax
        currencyCode
      }
      ... on OrderModificationError { errorCode message }
      ... on IneligibleShippingMethodError { errorCode message }
      ... on NoActiveOrderError { errorCode message }
    }
  }
`;

export const TRANSITION_ORDER_TO_STATE_MUTATION = `
  mutation TransitionOrderToState($state: String!) {
    transitionOrderToState(state: $state) {
      __typename
      ... on Order { id state }
      ... on OrderStateTransitionError {
        errorCode
        message
        transitionError
        fromState
        toState
      }
    }
  }
`;

export const ADD_PAYMENT_TO_ORDER_MUTATION = `
  mutation AddPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      __typename
      ... on Order {
        id
        code
        state
        payments {
          id
          state
          method
          metadata
        }
      }
      ... on OrderPaymentStateError { errorCode message }
      ... on IneligiblePaymentMethodError { errorCode message eligibilityCheckerMessage }
      ... on PaymentFailedError { errorCode message paymentErrorMessage }
      ... on PaymentDeclinedError { errorCode message paymentErrorMessage }
      ... on OrderStateTransitionError { errorCode message transitionError fromState toState }
      ... on NoActiveOrderError { errorCode message }
    }
  }
`;

export const GET_ORDER_BY_CODE_QUERY = `
  query GetOrderByCode($code: String!) {
    orderByCode(code: $code) {
      id
      code
      state
      totalWithTax
      currencyCode
      payments {
        id
        state
        method
        errorMessage
        metadata
      }
    }
  }
`;

export const APPLY_COUPON_CODE_MUTATION = `
  mutation ApplyCouponCode($couponCode: String!) {
    applyCouponCode(couponCode: $couponCode) {
      __typename
      ... on Order {
        id
        totalWithTax
        subTotalWithTax
        couponCodes
        discounts { 
          description
          amountWithTax
        }
      }
      ... on CouponCodeExpiredError { errorCode message couponCode }
      ... on CouponCodeInvalidError { errorCode message couponCode }
      ... on CouponCodeLimitError   { errorCode message couponCode limit }
    }
  }
`;

export const LOGOUT_MUTATION = `
  mutation Logout {
    logout {
      success
    }
  }
`;
