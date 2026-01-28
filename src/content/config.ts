import { defineCollection, z } from "astro:content";
import { csvLoader } from "@ascorbic/csv-loader";

const transactions = defineCollection({
  loader: csvLoader({
    fileName: "astrodotbuild-transactions.csv",
    idField: "Transaction ID",
    transformHeader: false,
  }),
  schema: z.object({
    "Effective Date & Time": z.string(),
    "Transaction ID": z.coerce.string(),
    Description: z.string(),
    "Credit/Debit": z.enum(["CREDIT", "DEBIT"]),
    Kind: z.string(),
    "Group ID": z.string(),
    "Amount Single Column": z.coerce.number(),
    Currency: z.string(),
    "Is Reverse": z.string().nullable(),
    "Is Reversed": z.string().nullable(),
    "Reverse Transaction ID": z.union([z.string(), z.number()]).nullable(),
    "Account Handle": z.string(),
    "Account Name": z.string(),
    "Opposite Account Handle": z.string(),
    "Opposite Account Name": z.string(),
    "Payment Processor": z.string().nullable(),
    "Payment Method": z.string().nullable(),
    "Contribution Memo": z.string().nullable(),
    "Expense Type": z.string().nullable(),
    "Expense Tags": z.string().nullable(),
    "Expense Payout Method Type": z.string().nullable(),
    "Accounting Category Code": z.union([z.string(), z.number()]).nullable(),
    "Accounting Category Name": z.string().nullable(),
    "Merchant ID": z.union([z.string(), z.number()]).nullable(),
    "Reverse Kind": z.string().nullable(),
    "Payment Processor Fee": z.coerce.number(),
    "Tax Amount": z.coerce.number(),
  }),
});

export const collections = { transactions };
