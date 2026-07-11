interface AddToCartButtonProps {
	inStock?: boolean;
	onClick?: () => void;
}

export default function AddToCartButton({ inStock = true, onClick }: AddToCartButtonProps) {
	return (
		<button disabled={!inStock} onClick={onClick} className="w-full bg-[#3b8578] hover:bg-[#2e6b61] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer text-white font-bold text-sm py-2.5 rounded-full transition-colors block">
			{inStock ? "Add to Cart" : "Sold out"}
		</button>
	);
}
