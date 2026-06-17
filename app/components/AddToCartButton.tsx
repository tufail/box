interface AddToCartButtonProps {
	inStock?: boolean;
	onClick?: () => void;
}

export default function AddToCartButton({ inStock = true, onClick }: AddToCartButtonProps) {
	return (
		<button disabled={!inStock} onClick={onClick} className="bg-primary hover:bg-green-700 disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed cursor-pointer text-white font-semibold text-sm py-2.5 px-7 rounded-full transition-colors w-auto mx-auto block">
			{inStock ? "Add to Cart" : "Out of Stock"}
		</button>
	);
}
