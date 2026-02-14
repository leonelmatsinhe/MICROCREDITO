export type Simulator = {
  accountNumber: any;
  loanId: any;
  companyId: any;
  interestRate: any;
  amount: any;
  numberOfInstallments: any;
  dueDate: any;
  status: any;
};

export type MpesaResponse = {
  output_ConversationID: string;
  output_ResponseCode: string;
  output_ResponseDesc: string;
  output_ThirdPartyReference: string;
  output_TransactionID: string;
};

export type Installments = [
  {
    id: any;
    companyId: any;
    loanId: any;
    installmentOrder: any;
    accountNumber: any;
    amortization: any;
    rateAmount: any;
    installment: any;
    dueDate: any;
    status: any;
    createdAt: any;
    updatedAt: any;
  }
]
