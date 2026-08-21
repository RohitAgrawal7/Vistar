import { appConfig } from "@/lib/config";
import { roundMoney } from "@/lib/format";

export function buildUpiPayUri(input: {
  amount: number;
  tableId: string;
  guestName: string;
}) {
  const amount = roundMoney(input.amount).toFixed(2);
  const note = `${appConfig.restaurantName} Table ${input.tableId} ${input.guestName}`.slice(0, 50);
  const params = new URLSearchParams({
    pa: appConfig.upiVpa,
    pn: appConfig.restaurantName,
    am: amount,
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}
