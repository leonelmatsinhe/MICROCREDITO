import dotenv from "dotenv";
dotenv.config();

import { initiateC2BPayment, getMpesaConfig } from "../src/services/MpesaOpenApiService";

async function main() {
  console.log("M-Pesa Config:", getMpesaConfig());

  // Customer 330, Loan 63, Installment 833
  // Installment: 1334.04 MZN, Late interest: 293.48 MZN, Total with mora rounded: 1628 MZN
  const params = {
    companyId: 36,
    customerId: 330,
    loanId: 63,
    amortizationLoanId: 833,
    amount: 1628,
    phone: "258848353816",
  };

  console.log("Initiating C2B payment with full mora included:", params);

  try {
    const result = await initiateC2BPayment(params);
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error("Error:", error?.message || error);
    if (error?.errors) {
      console.error("Detailed Validation Errors:", error.errors);
    }
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
