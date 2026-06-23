import { createContext, useContext, useState, useCallback } from "react";

interface CartContextValue {
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  cartCount: number;
  setCartCount: (n: number) => void;
  cartRefreshKey: number;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  initialCount = 0,
}: {
  children: React.ReactNode;
  initialCount?: number;
}) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(initialCount);
  const [cartRefreshKey, setCartRefreshKey] = useState(0);
  const refreshCart = useCallback(() => setCartRefreshKey((k) => k + 1), []);

  return (
    <CartContext.Provider
      value={{
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        cartCount,
        setCartCount,
        cartRefreshKey,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
