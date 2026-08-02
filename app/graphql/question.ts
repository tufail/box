export interface ProductQuestionItem {
	id: string;
	createdAt: string;
	questionText: string;
	askerName: string | null;
	answerText: string | null;
	answeredAt: string | null;
	isVerifiedPurchase: boolean;
}

export interface ProductQuestionsData {
	productQuestionsBySlug: {
		items: ProductQuestionItem[];
		totalItems: number;
	};
}

export const PRODUCT_QUESTIONS_QUERY = `
	query ProductQuestionsBySlug($slug: String!, $options: ProductQuestionListOptions) {
		productQuestionsBySlug(slug: $slug, options: $options) {
			items {
				id
				createdAt
				questionText
				askerName
				answerText
				answeredAt
				isVerifiedPurchase
			}
			totalItems
		}
	}
`;

export interface SubmitProductQuestionData {
	submitProductQuestion: ProductQuestionItem;
}

export const SUBMIT_PRODUCT_QUESTION_MUTATION = `
	mutation SubmitProductQuestion($input: SubmitProductQuestionInput!) {
		submitProductQuestion(input: $input) {
			id
			createdAt
			questionText
			askerName
			answerText
			answeredAt
			isVerifiedPurchase
		}
	}
`;
