interface AddToCartButtonProps {
  inStock?: boolean;
  onClick?: () => void;
}

export default function AddToCartButton({ inStock = true, onClick }: AddToCartButtonProps) {
  return (
    <button
      disabled={!inStock}
      onClick={onClick}
      className="w-full bg-primary hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded-full transition-colors"
    >
      {inStock ? "Add to Cart" : "Out of Stock"}
    </button>
  );
}
