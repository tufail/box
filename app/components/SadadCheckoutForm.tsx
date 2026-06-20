import { useEffect, useRef } from "react";
import type { SadadPaymentMetadata } from "~/types/sadad";

interface Props {
  metadata: SadadPaymentMetadata;
}

export function SadadCheckoutForm({ metadata }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.submit();
  }, []);

  const { checkoutUrl, formParams, products } = metadata;

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-600">Redirecting to Sadad secure payment…</p>

      <form ref={formRef} method="POST" action={checkoutUrl} style={{ display: "none" }}>
        {Object.entries(formParams).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        {products.map((product, i) => (
          <div key={i}>
            <input type="hidden" name={`productdetail[${i}][order_id]`} value={product.order_id} />
            <input type="hidden" name={`productdetail[${i}][amount]`} value={product.amount} />
            <input type="hidden" name={`productdetail[${i}][quantity]`} value={product.quantity} />
          </div>
        ))}
      </form>

      <button
        type="button"
        className="mt-2 underline text-sm text-gray-400"
        onClick={() => formRef.current?.submit()}
      >
        Click here if not redirected automatically
      </button>
    </div>
  );
}
