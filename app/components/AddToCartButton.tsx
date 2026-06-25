interface AddToCartButtonProps {
	inStock?: boolean;
	onClick?: () => void;
}

export default function AddToCartButton({ inStock = true, onClick }: AddToCartButtonProps) {
	return (
		<button disabled={!inStock} onClick={onClick} className="w-full bg-[#3b8578] hover:bg-[#2e6b61] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed cursor-pointer text-white font-semibold text-sm py-1.5 rounded-full transition-colors block">
			{inStock ? "Add to Cart" : "Out of Stock"}
		</button>
	);
}
