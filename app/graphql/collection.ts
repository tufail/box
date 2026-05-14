import { graphql, type ResultOf } from "./graphql";

export const GET_COLLECTION = graphql(`
  query GetCollection($id: ID, $slug: String) {
    collection(id: $id, slug: $slug) {
      id
      name
      slug
      description
      featuredAsset {
        id
        preview
      }
    }
  }
`);

export const GET_COLLECTIONS = graphql(`
  query GetCollections($options: CollectionListOptions) {
    collections(options: $options) {
      totalItems
      items {
        id
        name
        slug
        description
        parentId
        children {
          id
          name
          slug
          description
          parentId
          children {
            id
            name
            slug
            description
            parentId
          }
        }
      }
    }
  }
`);

export type CollectionsResult = ResultOf<typeof GET_COLLECTIONS>;
export type CollectionItem = CollectionsResult["collections"]["items"][number];
