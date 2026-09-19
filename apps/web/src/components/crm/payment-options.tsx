"use client";

import { paymentLabels, payments, type Payment } from "@rieltordeals/domain";
import { Checkbox } from "@/components/ui/checkbox";

export function PaymentOptions({ value, onChange, disabled }: {
  value: Payment[];
  onChange: (value: Payment[]) => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label="Способы оплаты" className="flex flex-wrap gap-x-4 gap-y-2 py-2">
      {payments.map((payment) => (
        <label key={payment} className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm">
          <Checkbox
            checked={value.includes(payment)}
            disabled={disabled}
            onCheckedChange={(checked) => onChange(
              payments.filter((option) => option === payment ? checked === true : value.includes(option)),
            )}
          />
          {paymentLabels[payment]}
        </label>
      ))}
    </div>
  );
}
