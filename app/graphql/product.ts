import { graphql, type ResultOf } from "./graphql";

const GET_PRODUCTS = graphql(`
  query GetProducts {
    products(options: { take: 5 }) {
      items { id, name }
    }
  }
`);
const data = {} as ResultOf<typeof GET_PRODUCTS>; 